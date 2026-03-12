import crypto from "crypto";
import { URL } from "url";
import dns from "dns/promises";
import net from "net";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { EventName, EventPayload } from "@/server/events/types";
import type {
  WebhookCreateInput,
  WebhookUpdateInput,
  WebhookGetByIdInput,
  WebhookListInput,
  WebhookDeleteInput,
  WebhookRegenerateSecretInput,
  WebhookDeliveryListInput,
  WebhookTestInput,
} from "./webhook.schemas";

export {
  webhookCreateInput,
  webhookUpdateInput,
  webhookGetByIdInput,
  webhookListInput,
  webhookDeleteInput,
  webhookRegenerateSecretInput,
  webhookDeliveryListInput,
  webhookTestInput,
} from "./webhook.schemas";

export type {
  WebhookCreateInput,
  WebhookUpdateInput,
  WebhookGetByIdInput,
  WebhookListInput,
  WebhookDeleteInput,
  WebhookRegenerateSecretInput,
  WebhookDeliveryListInput,
  WebhookTestInput,
} from "./webhook.schemas";

const childLogger = logger.child({ service: "webhook" });

export class WebhookServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "WebhookServiceError";
  }
}

function generateSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

export function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local / cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0
    if (parts[0] === 0) return true;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fe80:")) return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    // IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice(7);
      if (net.isIPv4(mapped)) return isPrivateIP(mapped);
    }
  }
  return false;
}

export async function validateWebhookUrl(url: string): Promise<void> {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new WebhookServiceError("INVALID_URL", "Webhook URL must use http or https");
  }

  const hostname = parsed.hostname;

  // Reject if hostname is an IP literal
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new WebhookServiceError(
        "INVALID_URL",
        "Webhook URL must not target private/internal networks",
      );
    }
    return;
  }

  // Reject localhost
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new WebhookServiceError(
      "INVALID_URL",
      "Webhook URL must not target private/internal networks",
    );
  }

  // Resolve DNS (both A and AAAA records) and check all addresses
  const [v4Addresses, v6Addresses] = await Promise.all([
    dns.resolve4(hostname).catch(() => [] as string[]),
    dns.resolve6(hostname).catch(() => [] as string[]),
  ]);
  const addresses = [...v4Addresses, ...v6Addresses];
  if (addresses.length === 0) {
    throw new WebhookServiceError("INVALID_URL", "Could not resolve webhook URL hostname");
  }

  for (const addr of addresses) {
    if (isPrivateIP(addr)) {
      throw new WebhookServiceError(
        "INVALID_URL",
        "Webhook URL must not target private/internal networks",
      );
    }
  }
}

function computeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

interface SerializedWebhook {
  id: string;
  name: string;
  url: string;
  status: string;
  events: string[];
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null; email: string };
}

function serializeWebhook(webhook: {
  id: string;
  name: string;
  url: string;
  status: string;
  events: string[];
  description: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; name: string | null; email: string };
}): SerializedWebhook {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    status: webhook.status,
    events: webhook.events,
    description: webhook.description,
    createdById: webhook.createdById,
    createdAt: webhook.createdAt.toISOString(),
    updatedAt: webhook.updatedAt.toISOString(),
    createdBy: webhook.createdBy
      ? { id: webhook.createdBy.id, name: webhook.createdBy.name, email: webhook.createdBy.email }
      : undefined,
  };
}

export async function createWebhook(
  input: WebhookCreateInput,
  userId: string,
): Promise<SerializedWebhook> {
  await validateWebhookUrl(input.url);

  const secret = generateSecret();

  const webhook = await prisma.webhook.create({
    data: {
      name: input.name,
      url: input.url,
      secret,
      events: input.events,
      description: input.description,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  childLogger.info({ webhookId: webhook.id }, "Webhook created");

  eventBus.emit("webhook.created", {
    entity: "webhook",
    entityId: webhook.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  return serializeWebhook(webhook);
}

export async function getWebhook(input: WebhookGetByIdInput): Promise<SerializedWebhook> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: input.id },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  if (!webhook) {
    throw new WebhookServiceError("WEBHOOK_NOT_FOUND", "Webhook not found");
  }

  return serializeWebhook(webhook);
}

export async function listWebhooks(
  input: WebhookListInput,
): Promise<{ items: SerializedWebhook[]; nextCursor?: string }> {
  const { cursor, limit, status } = input;

  const webhooks = await prisma.webhook.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  let nextCursor: string | undefined;
  if (webhooks.length > limit) {
    const next = webhooks.pop();
    nextCursor = next?.id;
  }

  return {
    items: webhooks.map(serializeWebhook),
    nextCursor,
  };
}

export async function updateWebhook(
  input: WebhookUpdateInput,
  userId: string,
): Promise<SerializedWebhook> {
  const existing = await prisma.webhook.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new WebhookServiceError("WEBHOOK_NOT_FOUND", "Webhook not found");
  }

  if (input.url !== undefined) {
    await validateWebhookUrl(input.url);
  }

  const webhook = await prisma.webhook.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.events !== undefined ? { events: input.events } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  childLogger.info({ webhookId: webhook.id }, "Webhook updated");

  const eventName =
    input.status === "PAUSED"
      ? "webhook.paused"
      : input.status === "ACTIVE"
        ? "webhook.activated"
        : "webhook.updated";

  eventBus.emit(eventName as EventName, {
    entity: "webhook",
    entityId: webhook.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  return serializeWebhook(webhook);
}

export async function deleteWebhook(
  input: WebhookDeleteInput,
  userId: string,
): Promise<{ id: string }> {
  const existing = await prisma.webhook.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new WebhookServiceError("WEBHOOK_NOT_FOUND", "Webhook not found");
  }

  await prisma.webhook.delete({ where: { id: input.id } });

  childLogger.info({ webhookId: input.id }, "Webhook deleted");

  eventBus.emit("webhook.deleted", {
    entity: "webhook",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  return { id: input.id };
}

export async function regenerateWebhookSecret(
  input: WebhookRegenerateSecretInput,
  userId: string,
): Promise<{ id: string; secret: string }> {
  const existing = await prisma.webhook.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new WebhookServiceError("WEBHOOK_NOT_FOUND", "Webhook not found");
  }

  const secret = generateSecret();
  await prisma.webhook.update({
    where: { id: input.id },
    data: { secret },
  });

  childLogger.info({ webhookId: input.id }, "Webhook secret regenerated");

  eventBus.emit("webhook.updated", {
    entity: "webhook",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { action: "secret_regenerated" },
  });

  return { id: input.id, secret };
}

export async function listWebhookDeliveries(input: WebhookDeliveryListInput): Promise<{
  items: Array<{
    id: string;
    webhookId: string;
    eventName: string;
    status: string;
    httpStatusCode: number | null;
    errorMessage: string | null;
    attemptCount: number;
    deliveredAt: string | null;
    createdAt: string;
  }>;
  nextCursor?: string;
}> {
  const { webhookId, cursor, limit, status } = input;

  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      webhookId,
      ...(status ? { status } : {}),
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      webhookId: true,
      eventName: true,
      status: true,
      httpStatusCode: true,
      errorMessage: true,
      attemptCount: true,
      deliveredAt: true,
      createdAt: true,
    },
  });

  let nextCursor: string | undefined;
  if (deliveries.length > limit) {
    const next = deliveries.pop();
    nextCursor = next?.id;
  }

  return {
    items: deliveries.map((d) => ({
      id: d.id,
      webhookId: d.webhookId,
      eventName: d.eventName,
      status: d.status,
      httpStatusCode: d.httpStatusCode,
      errorMessage: d.errorMessage,
      attemptCount: d.attemptCount,
      deliveredAt: d.deliveredAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function testWebhook(
  input: WebhookTestInput,
  userId: string,
): Promise<{ deliveryId: string; status: string; httpStatusCode: number | null }> {
  const webhook = await prisma.webhook.findUnique({ where: { id: input.id } });
  if (!webhook) {
    throw new WebhookServiceError("WEBHOOK_NOT_FOUND", "Webhook not found");
  }

  const testPayload = {
    event: "webhook.test",
    timestamp: new Date().toISOString(),
    data: {
      entity: "webhook",
      entityId: webhook.id,
      actor: userId,
      message: "This is a test webhook delivery",
    },
  };

  const delivery = await deliverWebhookPayload(
    webhook.id,
    webhook.url,
    webhook.secret,
    "webhook.test",
    testPayload,
  );

  return {
    deliveryId: delivery.id,
    status: delivery.status,
    httpStatusCode: delivery.httpStatusCode,
  };
}

async function deliverWebhookPayload(
  webhookId: string,
  url: string,
  secret: string,
  eventName: string,
  payload: Prisma.InputJsonValue,
): Promise<{ id: string; status: string; httpStatusCode: number | null }> {
  await validateWebhookUrl(url);

  const payloadStr = JSON.stringify(payload);
  const signature = computeSignature(payloadStr, secret);

  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId,
      eventName,
      payload,
      status: "PENDING",
      attemptCount: 1,
    },
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": eventName,
        "X-Webhook-Delivery-Id": delivery.id,
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text().catch(() => "");
    const isSuccess = response.status >= 200 && response.status < 300;

    const updated = await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: isSuccess ? "SUCCESS" : "FAILED",
        httpStatusCode: response.status,
        responseBody: responseBody.slice(0, 4000),
        deliveredAt: isSuccess ? new Date() : null,
        errorMessage: isSuccess ? null : `HTTP ${response.status}`,
      },
    });

    return { id: updated.id, status: updated.status, httpStatusCode: updated.httpStatusCode };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const updated = await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        errorMessage: errorMessage.slice(0, 4000),
      },
    });

    childLogger.warn(
      { webhookId, deliveryId: delivery.id, error: errorMessage },
      "Webhook delivery failed",
    );

    return { id: updated.id, status: updated.status, httpStatusCode: null };
  }
}

export async function dispatchEventToWebhooks(
  eventName: EventName,
  payload: EventPayload,
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      status: "ACTIVE",
      events: { has: eventName },
    },
  });

  if (webhooks.length === 0) return;

  const webhookPayload: Prisma.InputJsonValue = {
    event: eventName,
    timestamp: payload.timestamp,
    data: JSON.parse(
      JSON.stringify({
        entity: payload.entity,
        entityId: payload.entityId,
        actor: payload.actor,
        metadata: payload.metadata,
      }),
    ) as Prisma.InputJsonValue,
  };

  const deliveryPromises = webhooks.map((webhook) =>
    deliverWebhookPayload(webhook.id, webhook.url, webhook.secret, eventName, webhookPayload).catch(
      (err) => {
        childLogger.error({ webhookId: webhook.id, error: err }, "Failed to dispatch webhook");
      },
    ),
  );

  await Promise.allSettled(deliveryPromises);
}

export function getAvailableEventNames(): string[] {
  return [
    "campaign.created",
    "campaign.updated",
    "campaign.phaseChanged",
    "idea.created",
    "idea.submitted",
    "idea.updated",
    "idea.statusChanged",
    "idea.transitioned",
    "idea.archived",
    "comment.created",
    "comment.updated",
    "comment.deleted",
    "user.registered",
    "evaluation.sessionCreated",
    "evaluation.sessionActivated",
    "evaluation.sessionCompleted",
    "evaluation.responseSubmitted",
    "channel.created",
    "channel.updated",
    "organization.created",
    "organization.updated",
    "useCase.created",
    "useCase.updated",
    "useCase.statusChanged",
    "webhook.test",
  ];
}
