import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { Prisma } from "@prisma/client";
import type {
  PortfolioOverviewInput,
  ProcessAnalysisInput,
  PortfolioMatrixInput,
} from "./portfolio-analyzer.schemas";

const childLogger = logger.child({ service: "portfolio-analyzer" });

export class PortfolioAnalyzerError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "PortfolioAnalyzerError";
  }
}

interface StatusCount {
  ACTIVE: number;
  ON_HOLD: number;
  COMPLETED: number;
  TERMINATED: number;
}

interface ProcessDefCount {
  id: string;
  name: string;
  projectCount: number;
}

interface PhaseMetrics {
  phaseId: string;
  phaseName: string;
  position: number;
  averageDurationDays: number | null;
  gatePassRate: number | null;
  reworkRate: number | null;
  terminationRate: number | null;
  instanceCount: number;
}

interface PortfolioOverview {
  totalProjects: number;
  statusCounts: StatusCount;
  projectsByProcessDef: ProcessDefCount[];
  averageTimeDays: number | null;
  gatePassRate: number | null;
  completionRate: number | null;
}

interface ProcessAnalysis {
  processDefinitionId: string;
  processDefinitionName: string;
  totalProjects: number;
  completionRate: number | null;
  terminationRate: number | null;
  phases: PhaseMetrics[];
}

interface MatrixProject {
  id: string;
  title: string;
  status: string;
  processDefinitionName: string;
  teamSize: number;
  phaseCount: number;
  completedPhases: number;
  progressPercent: number;
  durationDays: number;
  gatePassCount: number;
  gateTotalCount: number;
}

function buildProjectWhere(input: PortfolioOverviewInput): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {};

  if (input.processDefinitionId) {
    where.processDefinitionId = input.processDefinitionId;
  }
  if (input.status) {
    where.status = input.status;
  }
  if (input.dateFrom || input.dateTo) {
    where.createdAt = {};
    if (input.dateFrom) {
      where.createdAt.gte = new Date(input.dateFrom);
    }
    if (input.dateTo) {
      where.createdAt.lte = new Date(input.dateTo);
    }
  }

  return where;
}

export async function getPortfolioOverview(
  input: PortfolioOverviewInput,
): Promise<PortfolioOverview> {
  const where = buildProjectWhere(input);

  const [projects, processDefCounts] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.project.groupBy({
      by: ["processDefinitionId"],
      where,
      _count: { id: true },
    }),
  ]);

  const statusCounts: StatusCount = {
    ACTIVE: 0,
    ON_HOLD: 0,
    COMPLETED: 0,
    TERMINATED: 0,
  };
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  }

  const processDefIds = processDefCounts.map((g) => g.processDefinitionId);
  const processDefs =
    processDefIds.length > 0
      ? await prisma.processDefinition.findMany({
          where: { id: { in: processDefIds } },
          select: { id: true, name: true },
        })
      : [];

  const processDefMap = new Map(processDefs.map((pd) => [pd.id, pd.name]));

  const projectsByProcessDef: ProcessDefCount[] = processDefCounts.map((g) => ({
    id: g.processDefinitionId,
    name: processDefMap.get(g.processDefinitionId) ?? "Unknown",
    projectCount: g._count.id,
  }));

  const completedProjects = projects.filter((p) => p.status === "COMPLETED");
  const completionRate =
    projects.length > 0 ? (completedProjects.length / projects.length) * 100 : null;

  let averageTimeDays: number | null = null;
  if (completedProjects.length > 0) {
    const totalDays = completedProjects.reduce((sum, p) => {
      const durationMs = p.updatedAt.getTime() - p.createdAt.getTime();
      return sum + durationMs / (1000 * 60 * 60 * 24);
    }, 0);
    averageTimeDays = Math.round((totalDays / completedProjects.length) * 10) / 10;
  }

  const gateDecisions = await prisma.gateDecision.findMany({
    where: {
      phaseInstance: {
        project: where,
      },
    },
    select: { decision: true },
  });

  const gatePassRate =
    gateDecisions.length > 0
      ? (gateDecisions.filter((d) => d.decision === "FORWARD").length / gateDecisions.length) * 100
      : null;

  childLogger.info(
    { totalProjects: projects.length, filters: input },
    "Portfolio overview generated",
  );

  return {
    totalProjects: projects.length,
    statusCounts,
    projectsByProcessDef,
    averageTimeDays,
    gatePassRate: gatePassRate !== null ? Math.round(gatePassRate * 10) / 10 : null,
    completionRate: completionRate !== null ? Math.round(completionRate * 10) / 10 : null,
  };
}

export async function getProcessAnalysis(input: ProcessAnalysisInput): Promise<ProcessAnalysis> {
  const processDef = await prisma.processDefinition.findUnique({
    where: { id: input.processDefinitionId },
    select: {
      id: true,
      name: true,
      phases: {
        orderBy: { position: "asc" },
        select: { id: true, name: true, position: true },
      },
    },
  });

  if (!processDef) {
    throw new PortfolioAnalyzerError(
      "PROCESS_DEFINITION_NOT_FOUND",
      "Process definition not found",
    );
  }

  const projectCount = await prisma.project.count({
    where: { processDefinitionId: input.processDefinitionId },
  });

  const [completedCount, terminatedCount] = await Promise.all([
    prisma.project.count({
      where: { processDefinitionId: input.processDefinitionId, status: "COMPLETED" },
    }),
    prisma.project.count({
      where: { processDefinitionId: input.processDefinitionId, status: "TERMINATED" },
    }),
  ]);

  const phaseInstances = await prisma.projectPhaseInstance.findMany({
    where: {
      project: { processDefinitionId: input.processDefinitionId },
    },
    select: {
      phaseId: true,
      status: true,
      actualStartAt: true,
      actualEndAt: true,
      gateDecisions: {
        select: { decision: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const phaseMetricsMap = new Map<
    string,
    {
      durations: number[];
      forwardCount: number;
      reworkCount: number;
      terminateCount: number;
      totalDecisions: number;
      instanceCount: number;
    }
  >();

  for (const phase of processDef.phases) {
    phaseMetricsMap.set(phase.id, {
      durations: [],
      forwardCount: 0,
      reworkCount: 0,
      terminateCount: 0,
      totalDecisions: 0,
      instanceCount: 0,
    });
  }

  for (const instance of phaseInstances) {
    const metrics = phaseMetricsMap.get(instance.phaseId);
    if (!metrics) continue;

    metrics.instanceCount += 1;

    if (instance.actualStartAt && instance.actualEndAt) {
      const durationMs = instance.actualEndAt.getTime() - instance.actualStartAt.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      metrics.durations.push(durationDays);
    }

    const latestDecision = instance.gateDecisions[0];
    if (latestDecision) {
      metrics.totalDecisions += 1;
      if (latestDecision.decision === "FORWARD") metrics.forwardCount += 1;
      if (latestDecision.decision === "REWORK") metrics.reworkCount += 1;
      if (latestDecision.decision === "TERMINATE") metrics.terminateCount += 1;
    }
  }

  const phases: PhaseMetrics[] = processDef.phases.map((phase) => {
    const metrics = phaseMetricsMap.get(phase.id);
    if (!metrics) {
      return {
        phaseId: phase.id,
        phaseName: phase.name,
        position: phase.position,
        averageDurationDays: null,
        gatePassRate: null,
        reworkRate: null,
        terminationRate: null,
        instanceCount: 0,
      };
    }

    const avgDuration =
      metrics.durations.length > 0
        ? Math.round(
            (metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length) * 10,
          ) / 10
        : null;

    const gatePassRate =
      metrics.totalDecisions > 0
        ? Math.round((metrics.forwardCount / metrics.totalDecisions) * 1000) / 10
        : null;

    const reworkRate =
      metrics.totalDecisions > 0
        ? Math.round((metrics.reworkCount / metrics.totalDecisions) * 1000) / 10
        : null;

    const terminationRate =
      metrics.totalDecisions > 0
        ? Math.round((metrics.terminateCount / metrics.totalDecisions) * 1000) / 10
        : null;

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      position: phase.position,
      averageDurationDays: avgDuration,
      gatePassRate,
      reworkRate,
      terminationRate,
      instanceCount: metrics.instanceCount,
    };
  });

  childLogger.info(
    { processDefinitionId: input.processDefinitionId, projectCount },
    "Process analysis generated",
  );

  return {
    processDefinitionId: processDef.id,
    processDefinitionName: processDef.name,
    totalProjects: projectCount,
    completionRate:
      projectCount > 0 ? Math.round((completedCount / projectCount) * 1000) / 10 : null,
    terminationRate:
      projectCount > 0 ? Math.round((terminatedCount / projectCount) * 1000) / 10 : null,
    phases,
  };
}

export async function getPortfolioMatrix(input: PortfolioMatrixInput): Promise<MatrixProject[]> {
  const where: Prisma.ProjectWhereInput = {};

  if (input.processDefinitionId) {
    where.processDefinitionId = input.processDefinitionId;
  }
  if (input.status) {
    where.status = input.status;
  }

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      processDefinition: {
        select: { name: true },
      },
      _count: {
        select: { teamMembers: true },
      },
      phaseInstances: {
        select: {
          status: true,
          gateDecisions: {
            select: { decision: true },
          },
        },
      },
    },
  });

  const now = new Date();

  return projects.map((project) => {
    const phaseCount = project.phaseInstances.length;
    const completedPhases = project.phaseInstances.filter(
      (pi) => pi.status === "COMPLETED" || pi.status === "SKIPPED",
    ).length;

    const progressPercent = phaseCount > 0 ? Math.round((completedPhases / phaseCount) * 100) : 0;

    const durationMs = now.getTime() - project.createdAt.getTime();
    const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

    let gatePassCount = 0;
    let gateTotalCount = 0;
    for (const pi of project.phaseInstances) {
      for (const gd of pi.gateDecisions) {
        gateTotalCount += 1;
        if (gd.decision === "FORWARD") gatePassCount += 1;
      }
    }

    return {
      id: project.id,
      title: project.title,
      status: project.status,
      processDefinitionName: project.processDefinition.name,
      teamSize: project._count.teamMembers,
      phaseCount,
      completedPhases,
      progressPercent,
      durationDays,
      gatePassCount,
      gateTotalCount,
    };
  });
}
