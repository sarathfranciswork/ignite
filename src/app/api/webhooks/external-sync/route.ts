import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { updateSyncStatus } from "@/server/services/external-sync.service";

const childLogger = logger.child({ handler: "external-sync-webhook" });

interface WebhookPayload {
  syncedItemId?: string;
  externalId?: string;
  externalStatus: string;
  provider?: string;
  webhookToken?: string;
}

function extractJiraPayload(body: Record<string, unknown>): WebhookPayload | null {
  const issue = body["issue"] as Record<string, unknown> | undefined;
  if (!issue) return null;

  const changelog = body["changelog"] as Record<string, unknown> | undefined;
  const items = changelog?.["items"] as Array<Record<string, unknown>> | undefined;
  const statusChange = items?.find((i) => i["field"] === "status");

  if (!statusChange) return null;

  return {
    externalId: issue["key"] as string,
    externalStatus: statusChange["toString"] as string,
    provider: "JIRA",
    webhookToken: body["webhookToken"] as string | undefined,
  };
}

function extractAdoPayload(body: Record<string, unknown>): WebhookPayload | null {
  const resource = body["resource"] as Record<string, unknown> | undefined;
  if (!resource) return null;

  const fields = resource["fields"] as Record<string, unknown> | undefined;
  const stateField = fields?.["System.State"] as Record<string, unknown> | undefined;

  if (!stateField) return null;

  return {
    externalId: String(resource["workItemId"] ?? resource["id"] ?? ""),
    externalStatus: (stateField["newValue"] as string) ?? "",
    provider: "AZURE_DEVOPS",
    webhookToken: body["webhookToken"] as string | undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Try to extract payload from known formats
    let payload: WebhookPayload | null = null;

    // Direct format (our own format)
    if (body["syncedItemId"] && body["externalStatus"]) {
      payload = body as unknown as WebhookPayload;
    }

    // Jira webhook format
    if (!payload && body["issue"]) {
      payload = extractJiraPayload(body);
    }

    // Azure DevOps webhook format
    if (!payload && body["resource"]) {
      payload = extractAdoPayload(body);
    }

    if (!payload?.externalStatus) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Resolve synced item
    let syncedItemId = payload.syncedItemId;

    if (!syncedItemId && payload.externalId) {
      const syncedItem = await prisma.syncedItem.findFirst({
        where: { externalId: payload.externalId },
      });

      if (!syncedItem) {
        childLogger.warn(
          { externalId: payload.externalId },
          "Webhook received for unknown external item",
        );
        return NextResponse.json({ status: "ignored", reason: "unknown_item" });
      }

      syncedItemId = syncedItem.id;
    }

    if (!syncedItemId) {
      return NextResponse.json({ error: "Cannot resolve synced item" }, { status: 400 });
    }

    const updated = await updateSyncStatus({
      syncedItemId,
      externalStatus: payload.externalStatus,
    });

    childLogger.info(
      { syncedItemId, externalStatus: payload.externalStatus },
      "Webhook processed successfully",
    );

    return NextResponse.json({ status: "ok", syncedItemId: updated.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    childLogger.error({ error: message }, "Webhook processing failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
