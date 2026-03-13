import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  BiConnectorConfigureInput,
  BiConnectorListInput,
  BiConnectorRefreshInput,
  BiConnectorDeleteInput,
  BiConnectorGetEndpointsInput,
} from "./bi-connector.schemas";

const childLogger = logger.child({ service: "bi-connector" });

const REFRESH_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export class BiConnectorServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BiConnectorServiceError";
  }
}

export async function configureConnector(input: BiConnectorConfigureInput, userId: string) {
  const connector = await prisma.biConnector.create({
    data: {
      spaceId: input.spaceId,
      provider: input.provider,
      name: input.name,
      datasetConfig: input.datasetConfig,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      space: { select: { id: true, name: true } },
    },
  });

  childLogger.info(
    { connectorId: connector.id, provider: connector.provider, userId },
    "BI connector configured",
  );

  eventBus.emit("biConnector.configured", {
    entity: "BiConnector",
    entityId: connector.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { provider: connector.provider, spaceId: connector.spaceId },
  });

  return connector;
}

export async function listConnectors(input: BiConnectorListInput) {
  const take = input.limit + 1;
  const connectors = await prisma.biConnector.findMany({
    where: { spaceId: input.spaceId },
    take,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  let nextCursor: string | undefined;
  if (connectors.length > input.limit) {
    const next = connectors.pop();
    nextCursor = next?.id;
  }

  return { items: connectors, nextCursor };
}

export async function getConnectorById(id: string) {
  const connector = await prisma.biConnector.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      space: { select: { id: true, name: true } },
    },
  });

  if (!connector) {
    throw new BiConnectorServiceError("NOT_FOUND", "BI connector not found");
  }

  return connector;
}

export async function refreshDataset(input: BiConnectorRefreshInput, userId: string) {
  const connector = await prisma.biConnector.findUnique({ where: { id: input.id } });

  if (!connector) {
    throw new BiConnectorServiceError("NOT_FOUND", "BI connector not found");
  }

  if (!connector.isActive) {
    throw new BiConnectorServiceError("INACTIVE", "BI connector is inactive");
  }

  if (connector.lastRefreshedAt) {
    const elapsed = Date.now() - connector.lastRefreshedAt.getTime();
    if (elapsed < REFRESH_COOLDOWN_MS) {
      const remainingMinutes = Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 60000);
      throw new BiConnectorServiceError(
        "RATE_LIMITED",
        `Refresh rate limited. Try again in ${String(remainingMinutes)} minute(s).`,
      );
    }
  }

  const updated = await prisma.biConnector.update({
    where: { id: input.id },
    data: { lastRefreshedAt: new Date() },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info({ connectorId: updated.id, userId }, "BI connector dataset refreshed");

  eventBus.emit("biConnector.refreshed", {
    entity: "BiConnector",
    entityId: updated.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { provider: updated.provider },
  });

  return updated;
}

export async function deleteConnector(input: BiConnectorDeleteInput, userId: string) {
  const connector = await prisma.biConnector.findUnique({ where: { id: input.id } });

  if (!connector) {
    throw new BiConnectorServiceError("NOT_FOUND", "BI connector not found");
  }

  await prisma.biConnector.delete({ where: { id: input.id } });

  childLogger.info({ connectorId: input.id, userId }, "BI connector deleted");

  return { success: true };
}

export function getEndpoints(input: BiConnectorGetEndpointsInput) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const connectorId = input.id;

  return {
    ideas: `${baseUrl}/api/bi/${connectorId}/ideas`,
    campaigns: `${baseUrl}/api/bi/${connectorId}/campaigns`,
    evaluations: `${baseUrl}/api/bi/${connectorId}/evaluations`,
    projects: `${baseUrl}/api/bi/${connectorId}/projects`,
    metadata: `${baseUrl}/api/bi/${connectorId}/metadata`,
    odata: `${baseUrl}/api/bi/${connectorId}/odata`,
  };
}

// ── Dataset generation functions ─────────────────────────────

interface DatasetOptions {
  limit: number;
  offset: number;
}

interface DatasetColumn {
  name: string;
  type: string;
  description: string;
}

interface DatasetResult {
  columns: DatasetColumn[];
  rows: Record<string, unknown>[];
  totalCount: number;
}

export async function getIdeasDataset(
  connectorId: string,
  options: DatasetOptions,
): Promise<DatasetResult> {
  await getActiveConnector(connectorId);

  const [ideas, totalCount] = await Promise.all([
    prisma.idea.findMany({
      take: options.limit,
      skip: options.offset,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        likesCount: true,
        commentsCount: true,
        viewsCount: true,
        createdAt: true,
        updatedAt: true,
        contributor: { select: { id: true, name: true, email: true } },
        campaign: { select: { id: true, title: true } },
      },
    }),
    prisma.idea.count(),
  ]);

  const columns: DatasetColumn[] = [
    { name: "id", type: "string", description: "Idea ID" },
    { name: "title", type: "string", description: "Idea title" },
    { name: "status", type: "string", description: "Current status" },
    { name: "likes_count", type: "integer", description: "Number of likes" },
    { name: "comments_count", type: "integer", description: "Number of comments" },
    { name: "views_count", type: "integer", description: "Number of views" },
    { name: "contributor_name", type: "string", description: "Contributor name" },
    { name: "contributor_email", type: "string", description: "Contributor email" },
    { name: "campaign_id", type: "string", description: "Campaign ID" },
    { name: "campaign_title", type: "string", description: "Campaign title" },
    { name: "created_at", type: "datetime", description: "Creation date" },
    { name: "updated_at", type: "datetime", description: "Last update date" },
  ];

  const rows = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    status: idea.status,
    likes_count: idea.likesCount,
    comments_count: idea.commentsCount,
    views_count: idea.viewsCount,
    contributor_name: idea.contributor.name,
    contributor_email: idea.contributor.email,
    campaign_id: idea.campaign.id,
    campaign_title: idea.campaign.title,
    created_at: idea.createdAt.toISOString(),
    updated_at: idea.updatedAt.toISOString(),
  }));

  return { columns, rows, totalCount };
}

export async function getCampaignsDataset(
  connectorId: string,
  options: DatasetOptions,
): Promise<DatasetResult> {
  await getActiveConnector(connectorId);

  const [campaigns, totalCount] = await Promise.all([
    prisma.campaign.findMany({
      take: options.limit,
      skip: options.offset,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        submissionType: true,
        submissionCloseDate: true,
        votingCloseDate: true,
        launchedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true } },
        _count: { select: { ideas: true, members: true } },
      },
    }),
    prisma.campaign.count(),
  ]);

  const columns: DatasetColumn[] = [
    { name: "id", type: "string", description: "Campaign ID" },
    { name: "title", type: "string", description: "Campaign title" },
    { name: "status", type: "string", description: "Current status" },
    { name: "submission_type", type: "string", description: "Submission type" },
    { name: "submission_close_date", type: "datetime", description: "Submission close date" },
    { name: "voting_close_date", type: "datetime", description: "Voting close date" },
    { name: "launched_at", type: "datetime", description: "Launch date" },
    { name: "closed_at", type: "datetime", description: "Close date" },
    { name: "created_by", type: "string", description: "Creator name" },
    { name: "idea_count", type: "integer", description: "Number of ideas" },
    { name: "member_count", type: "integer", description: "Number of members" },
    { name: "created_at", type: "datetime", description: "Creation date" },
    { name: "updated_at", type: "datetime", description: "Last update date" },
  ];

  const rows = campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    submission_type: c.submissionType,
    submission_close_date: c.submissionCloseDate?.toISOString() ?? null,
    voting_close_date: c.votingCloseDate?.toISOString() ?? null,
    launched_at: c.launchedAt?.toISOString() ?? null,
    closed_at: c.closedAt?.toISOString() ?? null,
    created_by: c.createdBy.name,
    idea_count: c._count.ideas,
    member_count: c._count.members,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  }));

  return { columns, rows, totalCount };
}

export async function getEvaluationsDataset(
  connectorId: string,
  options: DatasetOptions,
): Promise<DatasetResult> {
  await getActiveConnector(connectorId);

  const [sessions, totalCount] = await Promise.all([
    prisma.evaluationSession.findMany({
      take: options.limit,
      skip: options.offset,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        mode: true,
        createdAt: true,
        updatedAt: true,
        campaign: { select: { id: true, title: true } },
        _count: { select: { evaluators: true, ideas: true, responses: true } },
      },
    }),
    prisma.evaluationSession.count(),
  ]);

  const columns: DatasetColumn[] = [
    { name: "id", type: "string", description: "Evaluation session ID" },
    { name: "title", type: "string", description: "Session title" },
    { name: "status", type: "string", description: "Session status" },
    { name: "type", type: "string", description: "Evaluation type" },
    { name: "mode", type: "string", description: "Evaluation mode" },
    { name: "campaign_id", type: "string", description: "Campaign ID" },
    { name: "campaign_title", type: "string", description: "Campaign title" },
    { name: "evaluator_count", type: "integer", description: "Number of evaluators" },
    { name: "idea_count", type: "integer", description: "Number of ideas" },
    { name: "response_count", type: "integer", description: "Number of responses" },
    { name: "created_at", type: "datetime", description: "Creation date" },
    { name: "updated_at", type: "datetime", description: "Last update date" },
  ];

  const rows = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    type: s.type,
    mode: s.mode,
    campaign_id: s.campaign?.id ?? null,
    campaign_title: s.campaign?.title ?? null,
    evaluator_count: s._count.evaluators,
    idea_count: s._count.ideas,
    response_count: s._count.responses,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  }));

  return { columns, rows, totalCount };
}

export async function getProjectsDataset(
  connectorId: string,
  options: DatasetOptions,
): Promise<DatasetResult> {
  await getActiveConnector(connectorId);

  const [projects, totalCount] = await Promise.all([
    prisma.project.findMany({
      take: options.limit,
      skip: options.offset,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        isConfidential: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true } },
        processDefinition: { select: { id: true, name: true } },
        _count: { select: { teamMembers: true, taskAssignments: true } },
      },
    }),
    prisma.project.count(),
  ]);

  const columns: DatasetColumn[] = [
    { name: "id", type: "string", description: "Project ID" },
    { name: "title", type: "string", description: "Project title" },
    { name: "status", type: "string", description: "Project status" },
    { name: "is_confidential", type: "boolean", description: "Is confidential" },
    { name: "process_definition", type: "string", description: "Process definition name" },
    { name: "created_by", type: "string", description: "Creator name" },
    { name: "team_member_count", type: "integer", description: "Number of team members" },
    { name: "task_count", type: "integer", description: "Number of task assignments" },
    { name: "created_at", type: "datetime", description: "Creation date" },
    { name: "updated_at", type: "datetime", description: "Last update date" },
  ];

  const rows = projects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    is_confidential: p.isConfidential,
    process_definition: p.processDefinition.name,
    created_by: p.createdBy.name,
    team_member_count: p._count.teamMembers,
    task_count: p._count.taskAssignments,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  }));

  return { columns, rows, totalCount };
}

export function getDatasetMetadata(connectorId: string) {
  return {
    connectorId,
    datasets: {
      ideas: {
        name: "Ideas",
        description: "All ideas submitted across campaigns",
        endpoint: `/api/bi/${connectorId}/ideas`,
      },
      campaigns: {
        name: "Campaigns",
        description: "All campaigns",
        endpoint: `/api/bi/${connectorId}/campaigns`,
      },
      evaluations: {
        name: "Evaluations",
        description: "All evaluation sessions",
        endpoint: `/api/bi/${connectorId}/evaluations`,
      },
      projects: {
        name: "Projects",
        description: "All projects",
        endpoint: `/api/bi/${connectorId}/projects`,
      },
    },
  };
}

export function formatAsCsv(columns: DatasetColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => escapeCsvField(c.name)).join(",");
  const dataRows = rows.map((row) =>
    columns.map((c) => escapeCsvField(String(row[c.name] ?? ""))).join(","),
  );
  return [header, ...dataRows].join("\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ── Internal helpers ─────────────────────────────────────────

async function getActiveConnector(connectorId: string) {
  const connector = await prisma.biConnector.findUnique({
    where: { id: connectorId },
  });

  if (!connector) {
    throw new BiConnectorServiceError("NOT_FOUND", "BI connector not found");
  }

  if (!connector.isActive) {
    throw new BiConnectorServiceError("INACTIVE", "BI connector is inactive");
  }

  return connector;
}
