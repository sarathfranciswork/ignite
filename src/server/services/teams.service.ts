import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { EventName, EventPayload } from "@/server/events/types";
import type {
  TeamsIntegrationCreateInput,
  TeamsIntegrationUpdateInput,
  TeamsIntegrationListInput,
  AdaptiveCard,
  TeamsWebhookPayload,
} from "./teams.schemas";
import { TEAMS_AVAILABLE_EVENTS } from "./teams.schemas";

const childLogger = logger.child({ service: "teams" });

const WEBHOOK_TIMEOUT_MS = 10_000;

export class TeamsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "TeamsServiceError";
  }
}

/**
 * Check whether Teams integration feature is available.
 * Teams integration uses incoming webhooks and requires no API key.
 */
export function getTeamsStatus(): { available: boolean; message: string } {
  return {
    available: true,
    message: "Teams integration is available via incoming webhooks",
  };
}

/**
 * Create a new Teams integration.
 */
export async function createTeamsIntegration(input: TeamsIntegrationCreateInput, userId: string) {
  validateEvents(input.events);

  const integration = await prisma.teamsIntegration.create({
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

  childLogger.info({ integrationId: integration.id, userId }, "Teams integration created");

  eventBus.emit("teams.integrationCreated", {
    entity: "TeamsIntegration",
    entityId: integration.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: integration.name },
  });

  return integration;
}

/**
 * Update an existing Teams integration.
 */
export async function updateTeamsIntegration(input: TeamsIntegrationUpdateInput, userId: string) {
  const existing = await prisma.teamsIntegration.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new TeamsServiceError("Teams integration not found", "NOT_FOUND");
  }

  if (input.events) {
    validateEvents(input.events);
  }

  const integration = await prisma.teamsIntegration.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.webhookUrl !== undefined && { webhookUrl: input.webhookUrl }),
      ...(input.events !== undefined && { events: input.events }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.campaignId !== undefined && { campaignId: input.campaignId }),
      ...(input.channelId !== undefined && { channelId: input.channelId }),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      channel: { select: { id: true, title: true } },
    },
  });

  childLogger.info({ integrationId: integration.id, userId }, "Teams integration updated");

  eventBus.emit("teams.integrationUpdated", {
    entity: "TeamsIntegration",
    entityId: integration.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: integration.name },
  });

  return integration;
}

/**
 * Delete a Teams integration.
 */
export async function deleteTeamsIntegration(id: string, userId: string) {
  const existing = await prisma.teamsIntegration.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new TeamsServiceError("Teams integration not found", "NOT_FOUND");
  }

  await prisma.teamsIntegration.delete({ where: { id } });

  childLogger.info({ integrationId: id, userId }, "Teams integration deleted");

  eventBus.emit("teams.integrationDeleted", {
    entity: "TeamsIntegration",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: existing.name },
  });
}

/**
 * Get a Teams integration by ID.
 */
export async function getTeamsIntegrationById(id: string) {
  const integration = await prisma.teamsIntegration.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      channel: { select: { id: true, title: true } },
    },
  });

  if (!integration) {
    throw new TeamsServiceError("Teams integration not found", "NOT_FOUND");
  }

  return integration;
}

/**
 * List Teams integrations with cursor-based pagination.
 */
export async function listTeamsIntegrations(input: TeamsIntegrationListInput) {
  const { campaignId, channelId, cursor, limit } = input;

  const where: Record<string, unknown> = {};
  if (campaignId) where.campaignId = campaignId;
  if (channelId) where.channelId = channelId;

  const integrations = await prisma.teamsIntegration.findMany({
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
 * Pause a Teams integration.
 */
export async function pauseTeamsIntegration(id: string, _userId: string) {
  return prisma.teamsIntegration.update({
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
 * Activate a Teams integration.
 */
export async function activateTeamsIntegration(id: string, _userId: string) {
  return prisma.teamsIntegration.update({
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
 * Send a test message to a Teams integration webhook.
 */
export async function sendTestMessage(id: string) {
  const integration = await prisma.teamsIntegration.findUnique({
    where: { id },
  });

  if (!integration) {
    throw new TeamsServiceError("Teams integration not found", "NOT_FOUND");
  }

  const card = buildAdaptiveCard({
    title: "Test Notification",
    subtitle: "Ignite Platform",
    body: "This is a test message from Ignite. Your Teams integration is working correctly!",
    facts: [
      { label: "Integration", value: integration.name },
      { label: "Status", value: "Connected" },
    ],
    accentColor: "Good",
  });

  await sendWebhookMessage(integration.webhookUrl, card, id);

  await prisma.teamsIntegration.update({
    where: { id },
    data: { lastSentAt: new Date(), status: "ACTIVE", lastError: null },
  });

  childLogger.info({ integrationId: id }, "Test message sent to Teams");
}

/**
 * Dispatch an event to all matching Teams integrations.
 * Called by the Teams event listener.
 */
export async function dispatchEventToTeams(eventName: EventName, payload: EventPayload) {
  const integrations = await prisma.teamsIntegration.findMany({
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

  const card = buildEventCard(eventName, payload);

  const results = await Promise.allSettled(
    integrations.map(async (integration) => {
      if (integration.campaignId && payload.metadata) {
        const eventCampaignId = payload.metadata.campaignId as string | undefined;
        if (eventCampaignId && eventCampaignId !== integration.campaignId) {
          return;
        }
      }

      try {
        await sendWebhookMessage(integration.webhookUrl, card, integration.id);
        await prisma.teamsIntegration.update({
          where: { id: integration.id },
          data: { lastSentAt: new Date() },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        childLogger.error(
          { integrationId: integration.id, event: eventName, error: errorMessage },
          "Failed to send Teams notification",
        );
        await prisma.teamsIntegration.update({
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
      "Some Teams notifications failed",
    );
  }
}

/**
 * Get the list of events available for Teams subscriptions.
 */
export function getAvailableTeamsEvents(): string[] {
  return [...TEAMS_AVAILABLE_EVENTS];
}

// ── Internal helpers ──────────────────────────────────────────

function validateEvents(events: string[]) {
  const availableEvents = new Set<string>(TEAMS_AVAILABLE_EVENTS);
  const invalid = events.filter((e) => !availableEvents.has(e));
  if (invalid.length > 0) {
    throw new TeamsServiceError(`Invalid event names: ${invalid.join(", ")}`, "INVALID_EVENTS");
  }
}

interface CardOptions {
  title: string;
  subtitle: string;
  body: string;
  facts?: Array<{ label: string; value: string }>;
  actionUrl?: string;
  actionTitle?: string;
  accentColor?: "Default" | "Good" | "Warning" | "Attention" | "Accent";
}

function buildAdaptiveCard(options: CardOptions): AdaptiveCard {
  const body: AdaptiveCard["body"] = [
    {
      type: "TextBlock",
      text: options.title,
      weight: "Bolder",
      size: "Medium",
      color: options.accentColor ?? "Accent",
      wrap: true,
    },
    {
      type: "TextBlock",
      text: options.subtitle,
      size: "Small",
      color: "Light",
      spacing: "None",
      wrap: true,
    },
    {
      type: "TextBlock",
      text: options.body,
      wrap: true,
      spacing: "Medium",
    },
  ];

  if (options.facts && options.facts.length > 0) {
    for (const fact of options.facts) {
      body.push({
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "auto",
            items: [
              {
                type: "TextBlock",
                text: `**${fact.label}:**`,
                weight: "Bolder",
                size: "Small",
                wrap: true,
              },
            ],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "TextBlock",
                text: fact.value,
                size: "Small",
                wrap: true,
              },
            ],
          },
        ],
      });
    }
  }

  const card: AdaptiveCard = {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body,
  };

  if (options.actionUrl && options.actionTitle) {
    card.actions = [
      {
        type: "Action.OpenUrl",
        title: options.actionTitle,
        url: options.actionUrl,
      },
    ];
  }

  return card;
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

const EVENT_COLORS: Record<string, CardOptions["accentColor"]> = {
  "campaign.created": "Good",
  "campaign.phaseChanged": "Accent",
  "idea.created": "Good",
  "idea.submitted": "Good",
  "evaluation.completed": "Accent",
  "organization.imported": "Accent",
};

function buildEventCard(eventName: EventName, payload: EventPayload): AdaptiveCard {
  const displayName = EVENT_DISPLAY_NAMES[eventName] ?? eventName;
  const color = EVENT_COLORS[eventName] ?? "Default";

  const facts: Array<{ label: string; value: string }> = [
    { label: "Event", value: displayName },
    { label: "Entity", value: payload.entity },
  ];

  if (payload.metadata) {
    const meta = payload.metadata;
    if (typeof meta.name === "string") {
      facts.push({ label: "Name", value: meta.name });
    }
    if (typeof meta.title === "string") {
      facts.push({ label: "Title", value: meta.title });
    }
    if (typeof meta.status === "string") {
      facts.push({ label: "Status", value: meta.status });
    }
    if (typeof meta.fromStatus === "string" && typeof meta.toStatus === "string") {
      facts.push({ label: "Transition", value: `${meta.fromStatus} → ${meta.toStatus}` });
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const entityUrl = buildEntityUrl(baseUrl, payload.entity, payload.entityId);

  return buildAdaptiveCard({
    title: `Ignite: ${displayName}`,
    subtitle: `${payload.entity} #${payload.entityId.slice(0, 8)}`,
    body: `A ${displayName.toLowerCase()} event occurred in Ignite.`,
    facts,
    accentColor: color,
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

async function sendWebhookMessage(webhookUrl: string, card: AdaptiveCard, integrationId: string) {
  const payload: TeamsWebhookPayload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: card,
      },
    ],
  };

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
      throw new TeamsServiceError(
        `Teams webhook returned ${response.status}: ${responseText.slice(0, 200)}`,
        "WEBHOOK_ERROR",
      );
    }

    childLogger.debug({ integrationId, status: response.status }, "Teams webhook message sent");
  } catch (error) {
    if (error instanceof TeamsServiceError) throw error;

    const message = error instanceof Error ? error.message : "Unknown error";
    throw new TeamsServiceError(`Failed to send Teams webhook: ${message}`, "WEBHOOK_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
}
