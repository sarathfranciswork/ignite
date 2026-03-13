import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { EventName, EventPayload } from "@/server/events/types";
import type {
  SlackIntegrationCreateInput,
  SlackIntegrationUpdateInput,
  SlackIntegrationListInput,
  SlackBlock,
  SlackWebhookPayload,
} from "./slack-integration.schemas";
import { SLACK_AVAILABLE_EVENTS } from "./slack-integration.schemas";

const childLogger = logger.child({ service: "slack-integration" });

const WEBHOOK_TIMEOUT_MS = 10_000;

export class SlackServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "SlackServiceError";
  }
}

/**
 * Check whether Slack integration feature is available.
 */
export function getSlackStatus(): { available: boolean; message: string } {
  return {
    available: true,
    message: "Slack integration is available via incoming webhooks",
  };
}

/**
 * Create a new Slack integration.
 */
export async function createSlackIntegration(input: SlackIntegrationCreateInput, userId: string) {
  validateEvents(input.events);

  const integration = await prisma.slackIntegration.create({
    data: {
      name: input.name,
      webhookUrl: input.webhookUrl,
      events: input.events,
      description: input.description ?? null,
      campaignId: input.campaignId ?? null,
      channelId: input.channelId ?? null,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      channel: { select: { id: true, title: true } },
    },
  });

  childLogger.info({ integrationId: integration.id, userId }, "Slack integration created");

  eventBus.emit("slack.integrationCreated", {
    entity: "SlackIntegration",
    entityId: integration.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: integration.name },
  });

  return integration;
}

/**
 * Update an existing Slack integration.
 */
export async function updateSlackIntegration(input: SlackIntegrationUpdateInput, userId: string) {
  const existing = await prisma.slackIntegration.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new SlackServiceError("Slack integration not found", "NOT_FOUND");
  }

  if (input.events) {
    validateEvents(input.events);
  }

  const integration = await prisma.slackIntegration.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.webhookUrl !== undefined && { webhookUrl: input.webhookUrl }),
      ...(input.events !== undefined && { events: input.events }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.campaignId !== undefined && { campaignId: input.campaignId }),
      ...(input.channelId !== undefined && { channelId: input.channelId }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      channel: { select: { id: true, title: true } },
    },
  });

  childLogger.info({ integrationId: integration.id, userId }, "Slack integration updated");

  eventBus.emit("slack.integrationUpdated", {
    entity: "SlackIntegration",
    entityId: integration.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: integration.name },
  });

  return integration;
}

/**
 * Delete a Slack integration.
 */
export async function deleteSlackIntegration(id: string, userId: string) {
  const existing = await prisma.slackIntegration.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new SlackServiceError("Slack integration not found", "NOT_FOUND");
  }

  await prisma.slackIntegration.delete({ where: { id } });

  childLogger.info({ integrationId: id, userId }, "Slack integration deleted");

  eventBus.emit("slack.integrationDeleted", {
    entity: "SlackIntegration",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: existing.name },
  });
}

/**
 * Get a Slack integration by ID.
 */
export async function getSlackIntegrationById(id: string) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      channel: { select: { id: true, title: true } },
    },
  });

  if (!integration) {
    throw new SlackServiceError("Slack integration not found", "NOT_FOUND");
  }

  return integration;
}

/**
 * List Slack integrations with cursor-based pagination.
 */
export async function listSlackIntegrations(input: SlackIntegrationListInput) {
  const { campaignId, channelId, cursor, limit } = input;

  const where: Record<string, unknown> = {};
  if (campaignId) where.campaignId = campaignId;
  if (channelId) where.channelId = channelId;

  const integrations = await prisma.slackIntegration.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      channel: { select: { id: true, title: true } },
    },
  });

  let nextCursor: string | undefined;
  if (integrations.length > limit) {
    const nextItem = integrations.pop();
    nextCursor = nextItem?.id;
  }

  return { items: integrations, nextCursor };
}

/**
 * Pause a Slack integration.
 */
export async function pauseSlackIntegration(id: string, _userId: string) {
  return prisma.slackIntegration.update({
    where: { id },
    data: { status: "PAUSED" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      channel: { select: { id: true, title: true } },
    },
  });
}

/**
 * Activate a Slack integration.
 */
export async function activateSlackIntegration(id: string, _userId: string) {
  return prisma.slackIntegration.update({
    where: { id },
    data: { status: "ACTIVE", lastError: null },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      channel: { select: { id: true, title: true } },
    },
  });
}

/**
 * Send a test message to a Slack integration webhook.
 */
export async function sendTestMessage(id: string) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { id },
  });

  if (!integration) {
    throw new SlackServiceError("Slack integration not found", "NOT_FOUND");
  }

  if (!integration.webhookUrl) {
    throw new SlackServiceError("No webhook URL configured", "NO_WEBHOOK");
  }

  const blocks = buildBlockKitMessage({
    title: "Test Notification",
    body: "This is a test message from Ignite. Your Slack integration is working correctly!",
    fields: [
      { label: "Integration", value: integration.name },
      { label: "Status", value: "Connected" },
    ],
  });

  await sendWebhookMessage(integration.webhookUrl, blocks, id);

  await prisma.slackIntegration.update({
    where: { id },
    data: { lastSentAt: new Date(), status: "ACTIVE", lastError: null },
  });

  childLogger.info({ integrationId: id }, "Test message sent to Slack");
}

/**
 * Test connection by verifying the webhook URL is reachable.
 */
export async function testConnection(
  webhookUrl: string,
): Promise<{ success: boolean; message: string }> {
  const blocks = buildBlockKitMessage({
    title: "Connection Test",
    body: "Ignite is verifying your Slack webhook connection.",
    fields: [],
  });

  try {
    await sendWebhookPayload(webhookUrl, {
      text: "Ignite connection test",
      blocks,
    });
    return { success: true, message: "Connection successful" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message };
  }
}

/**
 * Dispatch an event to all matching Slack integrations.
 * Called by the Slack event listener.
 */
export async function dispatchEventToSlack(eventName: EventName, payload: EventPayload) {
  const integrations = await prisma.slackIntegration.findMany({
    where: {
      status: "ACTIVE",
      events: { has: eventName },
    },
    select: {
      id: true,
      webhookUrl: true,
      name: true,
      campaignId: true,
      channelId: true,
    },
  });

  if (integrations.length === 0) return;

  const blocks = buildEventBlocks(eventName, payload);

  const results = await Promise.allSettled(
    integrations.map(async (integration) => {
      if (!integration.webhookUrl) return;

      if (integration.campaignId && payload.metadata) {
        const eventCampaignId = payload.metadata.campaignId as string | undefined;
        if (eventCampaignId && eventCampaignId !== integration.campaignId) {
          return;
        }
      }

      try {
        await sendWebhookMessage(integration.webhookUrl, blocks, integration.id);
        await prisma.slackIntegration.update({
          where: { id: integration.id },
          data: { lastSentAt: new Date() },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        childLogger.error(
          { integrationId: integration.id, event: eventName, error: errorMessage },
          "Failed to send Slack notification",
        );
        await prisma.slackIntegration.update({
          where: { id: integration.id },
          data: { lastError: errorMessage, status: "ERROR" },
        });
      }
    }),
  );

  const failedCount = results.filter((r) => r.status === "rejected").length;
  if (failedCount > 0) {
    childLogger.warn(
      { event: eventName, total: integrations.length, failed: failedCount },
      "Some Slack notifications failed",
    );
  }
}

/**
 * Get the list of events available for Slack subscriptions.
 */
export function getAvailableSlackEvents(): string[] {
  return [...SLACK_AVAILABLE_EVENTS];
}

// ── Internal helpers ──────────────────────────────────────────

function validateEvents(events: string[]) {
  const availableEvents = new Set<string>(SLACK_AVAILABLE_EVENTS);
  const invalid = events.filter((e) => !availableEvents.has(e));
  if (invalid.length > 0) {
    throw new SlackServiceError(`Invalid event names: ${invalid.join(", ")}`, "INVALID_EVENTS");
  }
}

interface BlockKitOptions {
  title: string;
  body: string;
  fields?: Array<{ label: string; value: string }>;
  actionUrl?: string;
  actionTitle?: string;
}

function buildBlockKitMessage(options: BlockKitOptions): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: options.title,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: options.body,
      },
    },
  ];

  if (options.fields && options.fields.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: options.fields.map((f) => `*${f.label}:* ${f.value}`).join("\n"),
      },
    });
  }

  if (options.actionUrl && options.actionTitle) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${options.actionUrl}|${options.actionTitle}>`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "Sent from *Ignite* Innovation Platform",
      },
    ],
  });

  return blocks;
}

const EVENT_DISPLAY_NAMES: Record<string, string> = {
  "campaign.created": "Campaign Created",
  "campaign.phaseChanged": "Campaign Phase Changed",
  "campaign.updated": "Campaign Updated",
  "idea.created": "Idea Created",
  "idea.submitted": "Idea Submitted",
  "idea.statusChanged": "Idea Status Changed",
  "idea.transitioned": "Idea Transitioned",
  "idea.voted": "Idea Voted",
  "idea.liked": "Idea Liked",
  "comment.created": "New Comment",
  "evaluation.sessionCreated": "Evaluation Session Created",
  "evaluation.sessionCompleted": "Evaluation Session Completed",
  "evaluation.completed": "Evaluation Completed",
  "organization.created": "Organization Created",
  "organization.imported": "Organization Imported",
};

const EVENT_EMOJIS: Record<string, string> = {
  "campaign.created": ":rocket:",
  "campaign.phaseChanged": ":arrows_counterclockwise:",
  "idea.created": ":bulb:",
  "idea.submitted": ":inbox_tray:",
  "idea.voted": ":ballot_box:",
  "idea.liked": ":thumbsup:",
  "comment.created": ":speech_balloon:",
  "evaluation.completed": ":chart_with_upwards_trend:",
  "organization.imported": ":building_construction:",
};

function buildEventBlocks(eventName: EventName, payload: EventPayload): SlackBlock[] {
  const displayName = EVENT_DISPLAY_NAMES[eventName] ?? eventName;
  const emoji = EVENT_EMOJIS[eventName] ?? ":bell:";

  const fields: Array<{ label: string; value: string }> = [
    { label: "Event", value: displayName },
    { label: "Entity", value: payload.entity },
  ];

  if (payload.metadata) {
    const meta = payload.metadata;
    if (typeof meta.name === "string") {
      fields.push({ label: "Name", value: meta.name });
    }
    if (typeof meta.title === "string") {
      fields.push({ label: "Title", value: meta.title });
    }
    if (typeof meta.status === "string") {
      fields.push({ label: "Status", value: meta.status });
    }
    if (typeof meta.fromStatus === "string" && typeof meta.toStatus === "string") {
      fields.push({ label: "Transition", value: `${meta.fromStatus} → ${meta.toStatus}` });
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const entityUrl = buildEntityUrl(baseUrl, payload.entity, payload.entityId);

  return buildBlockKitMessage({
    title: `${emoji} Ignite: ${displayName}`,
    body: `A *${displayName.toLowerCase()}* event occurred in Ignite.`,
    fields,
    ...(entityUrl && { actionUrl: entityUrl, actionTitle: "View in Ignite" }),
  });
}

function buildEntityUrl(baseUrl: string, entity: string, entityId: string): string | undefined {
  if (!baseUrl) return undefined;

  const entityLower = entity.toLowerCase();
  const routeMap: Record<string, string> = {
    campaign: "campaigns",
    idea: "ideas",
    organization: "admin/organizations",
    evaluation: "campaigns",
    evaluationsession: "campaigns",
  };

  const route = routeMap[entityLower];
  if (!route) return undefined;

  return `${baseUrl}/${route}/${entityId}`;
}

async function sendWebhookMessage(webhookUrl: string, blocks: SlackBlock[], integrationId: string) {
  const displayName = EVENT_DISPLAY_NAMES["campaign.created"] ?? "Notification";
  const payload: SlackWebhookPayload = {
    text: `Ignite: ${displayName}`,
    blocks,
  };

  await sendWebhookPayload(webhookUrl, payload);

  childLogger.debug({ integrationId }, "Slack webhook message sent");
}

async function sendWebhookPayload(webhookUrl: string, payload: SlackWebhookPayload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new SlackServiceError(
        `Slack webhook returned ${response.status}: ${responseText.slice(0, 200)}`,
        "WEBHOOK_ERROR",
      );
    }
  } catch (error) {
    if (error instanceof SlackServiceError) throw error;

    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SlackServiceError(`Failed to send Slack webhook: ${message}`, "WEBHOOK_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
}
