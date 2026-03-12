import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type { IdeaLineageInput, DashboardStatsInput, PipelineStatsInput } from "./project.schemas";
import { Prisma } from "@prisma/client";

const childLogger = logger.child({ service: "traceability" });

export class TraceabilityServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "TraceabilityServiceError";
  }
}

interface LineageNode {
  type: "campaign" | "evaluation" | "concept" | "project";
  id: string;
  title: string;
  status: string;
  url: string;
  metadata?: Record<string, string | number | null>;
}

export async function getIdeaLineage(input: IdeaLineageInput) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: {
      id: true,
      title: true,
      status: true,
      campaignId: true,
      campaign: {
        select: { id: true, title: true, status: true },
      },
      evaluationSessionIdeas: {
        include: {
          session: {
            select: { id: true, title: true, status: true, campaignId: true },
          },
        },
        orderBy: { addedAt: "desc" as const },
      },
      sourceForConcepts: {
        select: {
          id: true,
          title: true,
          status: true,
          convertedProject: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      sourceForProjects: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!idea) {
    throw new TraceabilityServiceError("IDEA_NOT_FOUND", `Idea ${input.ideaId} not found`);
  }

  const nodes: LineageNode[] = [];

  nodes.push({
    type: "campaign",
    id: idea.campaign.id,
    title: idea.campaign.title,
    status: idea.campaign.status,
    url: `/campaigns/${idea.campaign.id}`,
  });

  if (idea.evaluationSessionIdeas.length > 0) {
    const latestSession = idea.evaluationSessionIdeas[0];
    if (latestSession) {
      nodes.push({
        type: "evaluation",
        id: latestSession.session.id,
        title: latestSession.session.title,
        status: latestSession.session.status,
        url: `/campaigns/${latestSession.session.campaignId}/evaluate/${latestSession.session.id}`,
      });
    }
  }

  for (const concept of idea.sourceForConcepts) {
    nodes.push({
      type: "concept",
      id: concept.id,
      title: concept.title,
      status: concept.status,
      url: `/projects/concepts/${concept.id}`,
    });

    if (concept.convertedProject) {
      nodes.push({
        type: "project",
        id: concept.convertedProject.id,
        title: concept.convertedProject.title,
        status: concept.convertedProject.status,
        url: `/projects/${concept.convertedProject.id}`,
      });
    }
  }

  for (const project of idea.sourceForProjects) {
    const alreadyLinked = nodes.some((n) => n.type === "project" && n.id === project.id);
    if (!alreadyLinked) {
      nodes.push({
        type: "project",
        id: project.id,
        title: project.title,
        status: project.status,
        url: `/projects/${project.id}`,
      });
    }
  }

  childLogger.info({ ideaId: input.ideaId, nodeCount: nodes.length }, "Lineage retrieved");

  return { ideaId: idea.id, ideaTitle: idea.title, ideaStatus: idea.status, nodes };
}

export async function getProjectSourceDetails(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      sourceIdea: {
        select: {
          id: true,
          title: true,
          status: true,
          contributorId: true,
          contributor: {
            select: { id: true, name: true, email: true, image: true },
          },
          campaign: {
            select: { id: true, title: true },
          },
          submittedAt: true,
          likesCount: true,
          commentsCount: true,
          viewsCount: true,
        },
      },
      sourceConcept: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  if (!project) {
    throw new TraceabilityServiceError("PROJECT_NOT_FOUND", `Project ${projectId} not found`);
  }

  return {
    sourceIdea: project.sourceIdea
      ? {
          id: project.sourceIdea.id,
          title: project.sourceIdea.title,
          status: project.sourceIdea.status,
          author: project.sourceIdea.contributor,
          campaign: project.sourceIdea.campaign,
          submittedAt: project.sourceIdea.submittedAt?.toISOString() ?? null,
          likesCount: project.sourceIdea.likesCount,
          commentsCount: project.sourceIdea.commentsCount,
          viewsCount: project.sourceIdea.viewsCount,
        }
      : null,
    sourceConcept: project.sourceConcept,
  };
}

export async function getDashboardStats(input: DashboardStatsInput) {
  const where: Prisma.ProjectWhereInput = {};

  if (input.status) {
    where.status = input.status;
  }
  if (input.processDefinitionId) {
    where.processDefinitionId = input.processDefinitionId;
  }
  if (input.teamMemberId) {
    where.teamMembers = { some: { userId: input.teamMemberId } };
  }
  if (input.dateFrom || input.dateTo) {
    where.createdAt = {};
    if (input.dateFrom) where.createdAt.gte = new Date(input.dateFrom);
    if (input.dateTo) where.createdAt.lte = new Date(input.dateTo);
  }

  const [statusCounts, processDefCounts, totalActive, projects] = await Promise.all([
    prisma.project.groupBy({
      by: ["status"],
      _count: { id: true },
      where,
    }),
    prisma.project.groupBy({
      by: ["processDefinitionId"],
      _count: { id: true },
      where,
    }),
    prisma.project.count({ where: { ...where, status: "ACTIVE" } }),
    prisma.project.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        processDefinition: { select: { id: true, name: true } },
        currentPhase: { select: { id: true, name: true } },
        phaseInstances: {
          select: {
            id: true,
            status: true,
            phase: { select: { id: true, name: true, position: true } },
            plannedStartAt: true,
            plannedEndAt: true,
            actualStartAt: true,
            actualEndAt: true,
          },
          orderBy: { phase: { position: "asc" } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const processDefIds = processDefCounts.map((p) => p.processDefinitionId);
  const processDefinitions = await prisma.processDefinition.findMany({
    where: { id: { in: processDefIds } },
    select: { id: true, name: true },
  });
  const processDefNameMap = new Map(processDefinitions.map((pd) => [pd.id, pd.name]));

  const byStatus = statusCounts.map((s) => ({
    status: s.status,
    count: s._count.id,
  }));

  const byProcessDefinition = processDefCounts.map((p) => ({
    processDefinitionId: p.processDefinitionId,
    processDefinitionName: processDefNameMap.get(p.processDefinitionId) ?? "Unknown",
    count: p._count.id,
  }));

  const totalProjects = byStatus.reduce((sum, s) => sum + s.count, 0);

  const timeline = projects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    processDefinition: p.processDefinition.name,
    currentPhase: p.currentPhase?.name ?? null,
    createdAt: p.createdAt.toISOString(),
    phases: p.phaseInstances.map((pi) => ({
      id: pi.id,
      name: pi.phase.name,
      position: pi.phase.position,
      status: pi.status,
      plannedStartAt: pi.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: pi.plannedEndAt?.toISOString() ?? null,
      actualStartAt: pi.actualStartAt?.toISOString() ?? null,
      actualEndAt: pi.actualEndAt?.toISOString() ?? null,
    })),
  }));

  let totalPhaseInstances = 0;
  let completedPhaseInstances = 0;
  for (const p of projects) {
    for (const pi of p.phaseInstances) {
      totalPhaseInstances++;
      if (pi.status === "COMPLETED") {
        completedPhaseInstances++;
      }
    }
  }

  const phaseCompletionRate =
    totalPhaseInstances > 0 ? Math.round((completedPhaseInstances / totalPhaseInstances) * 100) : 0;

  childLogger.info({ totalProjects }, "Dashboard stats retrieved");

  return {
    totalProjects,
    totalActive,
    byStatus,
    byProcessDefinition,
    phaseCompletionRate,
    timeline,
  };
}

export async function getPipelineStats(input: PipelineStatsInput) {
  const dateFilter: Prisma.DateTimeFilter | undefined =
    input.dateFrom || input.dateTo
      ? {
          ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
          ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
        }
      : undefined;

  const [
    ideasSubmitted,
    ideasEvaluated,
    ideasSelected,
    conceptCount,
    projectCount,
    completedCount,
  ] = await Promise.all([
    prisma.idea.count({
      where: {
        submittedAt: { not: null },
        ...(dateFilter ? { submittedAt: dateFilter } : {}),
      },
    }),
    prisma.evaluationSessionIdea.count({
      where: dateFilter ? { addedAt: dateFilter } : undefined,
    }),
    prisma.idea.count({
      where: {
        status: "SELECTED_IMPLEMENTATION",
        ...(dateFilter ? { updatedAt: dateFilter } : {}),
      },
    }),
    prisma.concept.count({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
    }),
    prisma.project.count({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
    }),
    prisma.project.count({
      where: {
        status: "COMPLETED",
        ...(dateFilter ? { updatedAt: dateFilter } : {}),
      },
    }),
  ]);

  const stages = [
    { name: "Ideas Submitted", count: ideasSubmitted },
    { name: "Evaluated", count: ideasEvaluated },
    { name: "Selected", count: ideasSelected },
    { name: "Concepts", count: conceptCount },
    { name: "Projects", count: projectCount },
    { name: "Completed", count: completedCount },
  ];

  const conversionRates = stages.slice(1).map((stage, i) => {
    const prev = stages[i];
    const rate = prev && prev.count > 0 ? Math.round((stage.count / prev.count) * 100) : 0;
    return {
      from: prev?.name ?? "",
      to: stage.name,
      rate,
    };
  });

  childLogger.info("Pipeline stats retrieved");

  return { stages, conversionRates };
}
