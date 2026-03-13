import ExcelJS from "exceljs";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  ExportCampaignReportInput,
  ExportPlatformReportInput,
  ExportIdeaListInput,
  ExportEvaluationResultsInput,
  ExportPartneringReportInput,
} from "./export.schemas";

const childLogger = logger.child({ service: "export" });

export class ExportServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ExportServiceError";
  }
}

// ── Shared styling helpers ───────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF4F46E5" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

const HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  vertical: "middle",
  horizontal: "center",
  wrapText: true,
};

function styleHeaderRow(sheet: ExcelJS.Worksheet): void {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = HEADER_ALIGNMENT;
  });
  headerRow.height = 28;
}

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 12, maxWidth = 50): void {
  sheet.columns.forEach((column) => {
    if (!column.eachCell) return;
    let longest = minWidth;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > longest) longest = len;
    });
    column.width = Math.min(longest + 2, maxWidth);
  });
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function workbookToBase64(workbook: ExcelJS.Workbook): Promise<string> {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

// ── Campaign Report Export ───────────────────────────────────

export async function exportCampaignReport(
  input: ExportCampaignReportInput,
  actor: string,
): Promise<{ base64: string; filename: string }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      submissionCloseDate: true,
      votingCloseDate: true,
      plannedCloseDate: true,
      launchedAt: true,
      closedAt: true,
      _count: { select: { members: true, ideas: true } },
    },
  });

  if (!campaign) {
    throw new ExportServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ignite Platform";
  workbook.created = new Date();

  // Sheet 1: Campaign Overview
  const overviewSheet = workbook.addWorksheet("Campaign Overview");
  overviewSheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 40 },
  ];
  styleHeaderRow(overviewSheet);

  overviewSheet.addRows([
    { metric: "Campaign Title", value: campaign.title },
    { metric: "Status", value: formatStatus(campaign.status) },
    { metric: "Created At", value: campaign.createdAt.toISOString().split("T")[0] },
    { metric: "Launched At", value: campaign.launchedAt?.toISOString().split("T")[0] ?? "N/A" },
    { metric: "Closed At", value: campaign.closedAt?.toISOString().split("T")[0] ?? "N/A" },
    {
      metric: "Submission Close Date",
      value: campaign.submissionCloseDate?.toISOString().split("T")[0] ?? "N/A",
    },
    {
      metric: "Voting Close Date",
      value: campaign.votingCloseDate?.toISOString().split("T")[0] ?? "N/A",
    },
    {
      metric: "Planned Close Date",
      value: campaign.plannedCloseDate?.toISOString().split("T")[0] ?? "N/A",
    },
    { metric: "Total Members", value: campaign._count.members },
    { metric: "Total Ideas", value: campaign._count.ideas },
  ]);

  // Engagement metrics
  const engagementAgg = await prisma.idea.aggregate({
    where: { campaignId: input.campaignId },
    _sum: { likesCount: true, commentsCount: true },
  });
  const voteCount = await prisma.ideaVote.count({
    where: { idea: { campaignId: input.campaignId } },
  });

  overviewSheet.addRows([
    { metric: "Total Likes", value: engagementAgg._sum.likesCount ?? 0 },
    { metric: "Total Comments", value: engagementAgg._sum.commentsCount ?? 0 },
    { metric: "Total Votes", value: voteCount },
  ]);

  // Idea status breakdown
  const ideaStatusGroups = await prisma.idea.groupBy({
    by: ["status"],
    where: { campaignId: input.campaignId },
    _count: { id: true },
  });

  overviewSheet.addRow({ metric: "", value: "" });
  overviewSheet.addRow({ metric: "--- Idea Status Breakdown ---", value: "" });
  for (const group of ideaStatusGroups) {
    overviewSheet.addRow({
      metric: `Ideas: ${formatStatus(group.status)}`,
      value: group._count.id,
    });
  }

  // Sheet 2: KPI Time Series (optional)
  if (input.includeKpiTimeSeries) {
    const kpiSheet = workbook.addWorksheet("KPI Time Series");
    kpiSheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Ideas Submitted", key: "ideasSubmitted", width: 18 },
      { header: "Ideas Qualified", key: "ideasQualified", width: 18 },
      { header: "Ideas Hot", key: "ideasHot", width: 14 },
      { header: "Ideas Evaluated", key: "ideasEvaluated", width: 18 },
      { header: "Ideas Selected", key: "ideasSelected", width: 18 },
      { header: "Total Comments", key: "totalComments", width: 18 },
      { header: "Total Votes", key: "totalVotes", width: 14 },
      { header: "Total Likes", key: "totalLikes", width: 14 },
      { header: "Participants", key: "totalParticipants", width: 14 },
    ];
    styleHeaderRow(kpiSheet);

    const dateFilter: Record<string, unknown> = {};
    if (input.dateRange?.from) {
      dateFilter.gte = new Date(input.dateRange.from);
    }
    if (input.dateRange?.to) {
      dateFilter.lte = new Date(input.dateRange.to);
    }

    const snapshots = await prisma.campaignKpiSnapshot.findMany({
      where: {
        campaignId: input.campaignId,
        ...(Object.keys(dateFilter).length > 0 ? { snapshotDate: dateFilter } : {}),
      },
      orderBy: { snapshotDate: "asc" },
    });

    for (const snap of snapshots) {
      kpiSheet.addRow({
        date: snap.snapshotDate.toISOString().split("T")[0],
        ideasSubmitted: snap.ideasSubmitted,
        ideasQualified: snap.ideasQualified,
        ideasHot: snap.ideasHot,
        ideasEvaluated: snap.ideasEvaluated,
        ideasSelected: snap.ideasSelected,
        totalComments: snap.totalComments,
        totalVotes: snap.totalVotes,
        totalLikes: snap.totalLikes,
        totalParticipants: snap.totalParticipants,
      });
    }

    autoFitColumns(kpiSheet);
  }

  // Sheet 3: Idea List (optional)
  if (input.includeIdeaList) {
    await addIdeaListSheet(workbook, input.campaignId, input.dateRange);
  }

  // Sheet 4: Evaluation Results (optional)
  if (input.includeEvaluationResults) {
    await addEvaluationSheet(workbook, input.campaignId);
  }

  const base64 = await workbookToBase64(workbook);
  const safeTitle = campaign.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
  const filename = `campaign_report_${safeTitle}_${new Date().toISOString().split("T")[0]}.xlsx`;

  eventBus.emit("report.exported", {
    entity: "campaign",
    entityId: campaign.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { reportType: "campaign", campaignTitle: campaign.title },
  });

  childLogger.info({ campaignId: input.campaignId, actor }, "Campaign report exported to Excel");

  return { base64, filename };
}

// ── Platform Report Export ───────────────────────────────────

export async function exportPlatformReport(
  input: ExportPlatformReportInput,
  actor: string,
): Promise<{ base64: string; filename: string }> {
  const dateFilter = input.dateRange?.from
    ? {
        createdAt: {
          ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
          ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
        },
      }
    : {};

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ignite Platform";
  workbook.created = new Date();

  // Sheet 1: Platform Summary
  const summarySheet = workbook.addWorksheet("Platform Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 },
  ];
  styleHeaderRow(summarySheet);

  const [totalCampaigns, activeCampaigns, totalIdeas, totalProjects, totalUsers] =
    await Promise.all([
      prisma.campaign.count({ where: dateFilter }),
      prisma.campaign.count({
        where: { ...dateFilter, status: { notIn: ["DRAFT", "CLOSED"] } },
      }),
      prisma.idea.count({ where: dateFilter }),
      prisma.project.count({ where: dateFilter }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

  summarySheet.addRows([
    { metric: "Total Campaigns", value: totalCampaigns },
    { metric: "Active Campaigns", value: activeCampaigns },
    { metric: "Total Ideas", value: totalIdeas },
    { metric: "Total Projects", value: totalProjects },
    { metric: "Active Users", value: totalUsers },
  ]);

  // Campaign status breakdown
  const campaignStatusGroups = await prisma.campaign.groupBy({
    by: ["status"],
    where: dateFilter,
    _count: { id: true },
  });

  summarySheet.addRow({ metric: "", value: "" });
  summarySheet.addRow({ metric: "--- Campaign Status ---", value: "" });
  for (const group of campaignStatusGroups) {
    summarySheet.addRow({
      metric: formatStatus(group.status),
      value: group._count.id,
    });
  }

  // Project status breakdown
  const projectStatusGroups = await prisma.project.groupBy({
    by: ["status"],
    where: dateFilter,
    _count: { id: true },
  });

  summarySheet.addRow({ metric: "", value: "" });
  summarySheet.addRow({ metric: "--- Project Status ---", value: "" });
  for (const group of projectStatusGroups) {
    summarySheet.addRow({
      metric: formatStatus(group.status),
      value: group._count.id,
    });
  }

  // Sheet 2: Top Campaigns
  const topCampaignsSheet = workbook.addWorksheet("Top Campaigns");
  topCampaignsSheet.columns = [
    { header: "Campaign", key: "title", width: 40 },
    { header: "Status", key: "status", width: 16 },
    { header: "Ideas", key: "ideaCount", width: 12 },
    { header: "Members", key: "memberCount", width: 12 },
    { header: "Likes", key: "likes", width: 12 },
    { header: "Comments", key: "comments", width: 12 },
    { header: "Created", key: "createdAt", width: 14 },
  ];
  styleHeaderRow(topCampaignsSheet);

  const campaignWhere = {
    ...dateFilter,
    status: { notIn: ["DRAFT" as const] },
    ...(input.campaignIds?.length ? { id: { in: input.campaignIds } } : {}),
  };

  const campaigns = await prisma.campaign.findMany({
    where: campaignWhere,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { ideas: true, members: true } },
    },
    orderBy: { ideas: { _count: "desc" } },
    take: 50,
  });

  for (const c of campaigns) {
    const agg = await prisma.idea.aggregate({
      where: { campaignId: c.id },
      _sum: { likesCount: true, commentsCount: true },
    });

    topCampaignsSheet.addRow({
      title: c.title,
      status: formatStatus(c.status),
      ideaCount: c._count.ideas,
      memberCount: c._count.members,
      likes: agg._sum.likesCount ?? 0,
      comments: agg._sum.commentsCount ?? 0,
      createdAt: c.createdAt.toISOString().split("T")[0],
    });
  }

  autoFitColumns(topCampaignsSheet);

  const base64 = await workbookToBase64(workbook);
  const filename = `platform_report_${new Date().toISOString().split("T")[0]}.xlsx`;

  eventBus.emit("report.exported", {
    entity: "platform",
    entityId: "platform",
    actor,
    timestamp: new Date().toISOString(),
    metadata: { reportType: "platform" },
  });

  childLogger.info({ actor }, "Platform report exported to Excel");

  return { base64, filename };
}

// ── Idea List Export ─────────────────────────────────────────

export async function exportIdeaList(
  input: ExportIdeaListInput,
  actor: string,
): Promise<{ base64: string; filename: string }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new ExportServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ignite Platform";
  workbook.created = new Date();

  await addIdeaListSheet(workbook, input.campaignId, input.dateRange, input.statuses);

  const base64 = await workbookToBase64(workbook);
  const safeTitle = campaign.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
  const filename = `ideas_${safeTitle}_${new Date().toISOString().split("T")[0]}.xlsx`;

  eventBus.emit("report.exported", {
    entity: "idea",
    entityId: campaign.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { reportType: "ideaList", campaignTitle: campaign.title },
  });

  childLogger.info({ campaignId: input.campaignId, actor }, "Idea list exported to Excel");

  return { base64, filename };
}

// ── Evaluation Results Export ─────────────────────────────────

export async function exportEvaluationResults(
  input: ExportEvaluationResultsInput,
  actor: string,
): Promise<{ base64: string; filename: string }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new ExportServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ignite Platform";
  workbook.created = new Date();

  await addEvaluationSheet(workbook, input.campaignId, input.evaluationSessionId);

  const base64 = await workbookToBase64(workbook);
  const safeTitle = campaign.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
  const filename = `evaluation_results_${safeTitle}_${new Date().toISOString().split("T")[0]}.xlsx`;

  eventBus.emit("report.exported", {
    entity: "evaluation",
    entityId: campaign.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { reportType: "evaluation", campaignTitle: campaign.title },
  });

  childLogger.info({ campaignId: input.campaignId, actor }, "Evaluation results exported to Excel");

  return { base64, filename };
}

// ── Shared Sheet Builders ────────────────────────────────────

async function addIdeaListSheet(
  workbook: ExcelJS.Workbook,
  campaignId: string,
  dateRange?: { from?: string; to?: string },
  statuses?: string[],
): Promise<void> {
  const sheet = workbook.addWorksheet("Ideas");
  sheet.columns = [
    { header: "Title", key: "title", width: 40 },
    { header: "Status", key: "status", width: 22 },
    { header: "Category", key: "category", width: 20 },
    { header: "Tags", key: "tags", width: 25 },
    { header: "Contributor", key: "contributor", width: 25 },
    { header: "Co-Authors", key: "coAuthors", width: 25 },
    { header: "Likes", key: "likes", width: 10 },
    { header: "Comments", key: "comments", width: 12 },
    { header: "Views", key: "views", width: 10 },
    { header: "Submitted At", key: "submittedAt", width: 14 },
    { header: "Created At", key: "createdAt", width: 14 },
  ];
  styleHeaderRow(sheet);

  const where: Record<string, unknown> = { campaignId };

  if (statuses?.length) {
    where.status = { in: statuses };
  }

  if (dateRange?.from || dateRange?.to) {
    where.createdAt = {
      ...(dateRange.from ? { gte: new Date(dateRange.from) } : {}),
      ...(dateRange.to ? { lte: new Date(dateRange.to) } : {}),
    };
  }

  const ideas = await prisma.idea.findMany({
    where,
    select: {
      title: true,
      status: true,
      category: true,
      tags: true,
      likesCount: true,
      commentsCount: true,
      viewsCount: true,
      submittedAt: true,
      createdAt: true,
      contributor: { select: { name: true, email: true } },
      coAuthors: { select: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const idea of ideas) {
    sheet.addRow({
      title: idea.title,
      status: formatStatus(idea.status),
      category: idea.category ?? "",
      tags: idea.tags.join(", "),
      contributor: idea.contributor.name ?? idea.contributor.email,
      coAuthors: idea.coAuthors.map((ca) => ca.user.name ?? "").join("; "),
      likes: idea.likesCount,
      comments: idea.commentsCount,
      views: idea.viewsCount,
      submittedAt: idea.submittedAt?.toISOString().split("T")[0] ?? "",
      createdAt: idea.createdAt.toISOString().split("T")[0],
    });
  }

  autoFitColumns(sheet);
}

async function addEvaluationSheet(
  workbook: ExcelJS.Workbook,
  campaignId: string,
  evaluationSessionId?: string,
): Promise<void> {
  const sessions = await prisma.evaluationSession.findMany({
    where: {
      campaignId,
      ...(evaluationSessionId ? { id: evaluationSessionId } : {}),
    },
    select: {
      id: true,
      title: true,
      type: true,
      mode: true,
      status: true,
      dueDate: true,
      createdAt: true,
      criteria: {
        select: { id: true, title: true, weight: true },
        orderBy: { sortOrder: "asc" },
      },
      ideas: {
        select: {
          idea: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (sessions.length === 0) {
    const emptySheet = workbook.addWorksheet("Evaluation Results");
    emptySheet.addRow(["No evaluation sessions found for this campaign."]);
    return;
  }

  // Sessions summary sheet
  const summarySheet = workbook.addWorksheet("Evaluation Sessions");
  summarySheet.columns = [
    { header: "Session Title", key: "title", width: 35 },
    { header: "Type", key: "type", width: 16 },
    { header: "Mode", key: "mode", width: 14 },
    { header: "Status", key: "status", width: 14 },
    { header: "Ideas", key: "ideaCount", width: 10 },
    { header: "Criteria", key: "criteriaCount", width: 12 },
    { header: "Due Date", key: "dueDate", width: 14 },
    { header: "Created", key: "createdAt", width: 14 },
  ];
  styleHeaderRow(summarySheet);

  for (const session of sessions) {
    summarySheet.addRow({
      title: session.title,
      type: formatStatus(session.type),
      mode: formatStatus(session.mode),
      status: formatStatus(session.status),
      ideaCount: session.ideas.length,
      criteriaCount: session.criteria.length,
      dueDate: session.dueDate?.toISOString().split("T")[0] ?? "",
      createdAt: session.createdAt.toISOString().split("T")[0],
    });
  }

  autoFitColumns(summarySheet);

  // Detailed scores sheet for each session with responses
  for (const session of sessions) {
    if (session.criteria.length === 0) continue;

    const sheetName = `Scores - ${session.title}`.substring(0, 31);
    const scoresSheet = workbook.addWorksheet(sheetName);

    const criteriaHeaders = session.criteria.map(
      (c: { id: string; title: string; weight: number }) => ({
        header: `${c.title} (w:${c.weight})`,
        key: c.id,
        width: 20,
      }),
    );

    scoresSheet.columns = [
      { header: "Idea", key: "idea", width: 35 },
      ...criteriaHeaders,
      { header: "Weighted Average", key: "weightedAvg", width: 18 },
    ];
    styleHeaderRow(scoresSheet);

    // Fetch responses for this session
    const responses = await prisma.evaluationResponse.findMany({
      where: { sessionId: session.id },
      select: {
        ideaId: true,
        criterionId: true,
        scoreValue: true,
      },
    });

    // Group responses by idea
    const ideaScores = new Map<string, Map<string, { total: number; count: number }>>();

    for (const resp of responses) {
      if (resp.scoreValue === null) continue;
      if (!ideaScores.has(resp.ideaId)) {
        ideaScores.set(resp.ideaId, new Map());
      }
      const criteriaMap = ideaScores.get(resp.ideaId)!;
      if (!criteriaMap.has(resp.criterionId)) {
        criteriaMap.set(resp.criterionId, { total: 0, count: 0 });
      }
      const entry = criteriaMap.get(resp.criterionId)!;
      entry.total += resp.scoreValue;
      entry.count += 1;
    }

    // Build rows
    for (const sessionIdea of session.ideas) {
      const idea = sessionIdea.idea;
      if (!idea) continue;
      const criteriaMap = ideaScores.get(idea.id);
      const row: Record<string, string | number> = { idea: idea.title };

      let weightedSum = 0;
      let totalWeight = 0;

      for (const criterion of session.criteria) {
        const entry = criteriaMap?.get(criterion.id);
        const avgScore = entry && entry.count > 0 ? entry.total / entry.count : 0;
        row[criterion.id] = entry ? Number(avgScore.toFixed(2)) : 0;
        weightedSum += avgScore * criterion.weight;
        totalWeight += criterion.weight;
      }

      row.weightedAvg = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0;
      scoresSheet.addRow(row);
    }

    autoFitColumns(scoresSheet);
  }
}

// ── Partnering Report Export ─────────────────────────────────

export async function exportPartneringReport(
  input: ExportPartneringReportInput,
  actor: string,
): Promise<{ base64: string; filename: string }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ignite Platform";
  workbook.created = new Date();

  const orgWhere: Record<string, unknown> = { isArchived: false };
  if (input.organizationIds?.length) {
    orgWhere.id = { in: input.organizationIds };
  }
  if (input.relationshipStatus) {
    orgWhere.relationshipStatus = input.relationshipStatus;
  }

  const organizations = await prisma.organization.findMany({
    where: orgWhere,
    select: {
      id: true,
      name: true,
      industry: true,
      location: true,
      relationshipStatus: true,
      ndaStatus: true,
      contacts: { select: { id: true } },
      managers: {
        select: {
          user: { select: { name: true, email: true } },
        },
      },
      useCases: {
        select: {
          useCase: { select: { title: true, status: true, createdAt: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Sheet 1: Organization Overview
  const orgSheet = workbook.addWorksheet("Organizations");
  orgSheet.columns = [
    { header: "Organization", key: "name", width: 30 },
    { header: "Industry", key: "industry", width: 20 },
    { header: "Location", key: "location", width: 20 },
    { header: "Relationship Status", key: "relationshipStatus", width: 22 },
    { header: "NDA Status", key: "ndaStatus", width: 14 },
    { header: "Contacts", key: "contacts", width: 12 },
    { header: "Managers", key: "managers", width: 30 },
    { header: "Use Cases", key: "useCases", width: 12 },
  ];
  styleHeaderRow(orgSheet);

  for (const org of organizations) {
    orgSheet.addRow({
      name: org.name,
      industry: org.industry ?? "",
      location: org.location ?? "",
      relationshipStatus: formatStatus(org.relationshipStatus),
      ndaStatus: formatStatus(org.ndaStatus),
      contacts: org.contacts.length,
      managers: org.managers.map((m) => m.user.name ?? m.user.email).join("; "),
      useCases: org.useCases.length,
    });
  }

  autoFitColumns(orgSheet);

  // Sheet 2: Use Case Pipeline (optional)
  if (input.includeUseCasePipeline) {
    const dateFilter =
      input.dateRange?.from || input.dateRange?.to
        ? {
            createdAt: {
              ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
              ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
            },
          }
        : {};

    const orgFilter = input.organizationIds?.length
      ? {
          organizations: {
            some: { organizationId: { in: input.organizationIds } },
          },
        }
      : {};

    const useCases = await prisma.useCase.findMany({
      where: { ...dateFilter, ...orgFilter },
      select: {
        title: true,
        status: true,
        problemDescription: true,
        benefit: true,
        createdAt: true,
        owner: { select: { name: true, email: true } },
        organizations: {
          select: {
            organization: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const pipelineSheet = workbook.addWorksheet("Use Case Pipeline");
    pipelineSheet.columns = [
      { header: "Title", key: "title", width: 35 },
      { header: "Status", key: "status", width: 18 },
      { header: "Organizations", key: "organizations", width: 30 },
      { header: "Owner", key: "owner", width: 25 },
      { header: "Problem Description", key: "problem", width: 40 },
      { header: "Benefit", key: "benefit", width: 30 },
      { header: "Created At", key: "createdAt", width: 14 },
    ];
    styleHeaderRow(pipelineSheet);

    for (const uc of useCases) {
      pipelineSheet.addRow({
        title: uc.title,
        status: formatStatus(uc.status),
        organizations: uc.organizations.map((o) => o.organization.name).join("; "),
        owner: uc.owner.name ?? uc.owner.email,
        problem: uc.problemDescription ?? "",
        benefit: uc.benefit ?? "",
        createdAt: uc.createdAt.toISOString().split("T")[0],
      });
    }

    autoFitColumns(pipelineSheet);
  }

  const base64 = await workbookToBase64(workbook);
  const filename = `partnering_report_${new Date().toISOString().split("T")[0]}.xlsx`;

  eventBus.emit("report.exported", {
    entity: "partnering",
    entityId: "partnering",
    actor,
    timestamp: new Date().toISOString(),
    metadata: { reportType: "partnering" },
  });

  childLogger.info(
    { actor, orgCount: organizations.length },
    "Partnering report exported to Excel",
  );

  return { base64, filename };
}
