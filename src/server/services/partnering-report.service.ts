import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { UseCaseStatus } from "@prisma/client";
import type {
  UseCasePipelineFunnelInput,
  OrganizationActivityInput,
} from "./partnering-report.schemas";

const childLogger = logger.child({ service: "partnering-report" });

export class PartneringReportServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "PartneringReportServiceError";
  }
}

// ── Types ────────────────────────────────────────────────────

export interface UseCasePipelineFunnelResult {
  funnel: Array<{
    status: string;
    count: number;
  }>;
  totalUseCases: number;
  byOrganization: Array<{
    organizationId: string;
    organizationName: string;
    useCaseCount: number;
    statusBreakdown: Record<string, number>;
  }>;
  generatedAt: string;
}

export interface OrganizationActivityResult {
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    industry: string | null;
    relationshipStatus: string;
    ndaStatus: string;
    contactCount: number;
    useCaseCount: number;
    useCaseStatusBreakdown: Record<string, number>;
    managerCount: number;
  }>;
  totals: {
    totalOrganizations: number;
    totalContacts: number;
    totalUseCases: number;
    relationshipStatusBreakdown: Record<string, number>;
  };
  generatedAt: string;
}

// ── Service Functions ────────────────────────────────────────

export async function getUseCasePipelineFunnel(
  input: UseCasePipelineFunnelInput,
): Promise<UseCasePipelineFunnelResult> {
  const dateFilter =
    input.dateRange?.from || input.dateRange?.to
      ? {
          createdAt: {
            ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
            ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
          },
        }
      : {};

  const organizationFilter = input.organizationIds?.length
    ? {
        organizations: {
          some: { organizationId: { in: input.organizationIds } },
        },
      }
    : {};

  const useCaseWhere = { ...dateFilter, ...organizationFilter };

  // Funnel: group use cases by status
  const statusGroups = await prisma.useCase.groupBy({
    by: ["status"],
    where: useCaseWhere,
    _count: { id: true },
  });

  const statusOrder: UseCaseStatus[] = [
    UseCaseStatus.IDENTIFIED,
    UseCaseStatus.QUALIFICATION,
    UseCaseStatus.EVALUATION,
    UseCaseStatus.PILOT,
    UseCaseStatus.PARTNERSHIP,
    UseCaseStatus.ARCHIVED,
  ];

  const statusMap = new Map(statusGroups.map((g) => [g.status, g._count.id]));
  const funnel = statusOrder.map((status) => ({
    status,
    count: statusMap.get(status) ?? 0,
  }));
  const totalUseCases = statusGroups.reduce((sum, g) => sum + g._count.id, 0);

  // Per-organization breakdown
  const useCasesWithOrgs = await prisma.useCase.findMany({
    where: useCaseWhere,
    select: {
      status: true,
      organizations: {
        select: {
          organization: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const orgMap = new Map<
    string,
    { name: string; statusCounts: Record<string, number>; total: number }
  >();

  for (const uc of useCasesWithOrgs) {
    for (const ucOrg of uc.organizations) {
      const orgId = ucOrg.organization.id;
      if (!orgMap.has(orgId)) {
        orgMap.set(orgId, { name: ucOrg.organization.name, statusCounts: {}, total: 0 });
      }
      const entry = orgMap.get(orgId)!;
      entry.statusCounts[uc.status] = (entry.statusCounts[uc.status] ?? 0) + 1;
      entry.total += 1;
    }
  }

  const byOrganization = Array.from(orgMap.entries())
    .map(([orgId, data]) => ({
      organizationId: orgId,
      organizationName: data.name,
      useCaseCount: data.total,
      statusBreakdown: data.statusCounts,
    }))
    .sort((a, b) => b.useCaseCount - a.useCaseCount);

  childLogger.info(
    { totalUseCases, orgCount: byOrganization.length },
    "Use case pipeline funnel generated",
  );

  return {
    funnel,
    totalUseCases,
    byOrganization,
    generatedAt: new Date().toISOString(),
  };
}

export async function getOrganizationActivity(
  input: OrganizationActivityInput,
): Promise<OrganizationActivityResult> {
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
      relationshipStatus: true,
      ndaStatus: true,
      contacts: {
        select: { id: true },
      },
      managers: {
        select: { id: true },
      },
      useCases: {
        select: {
          useCase: {
            select: { status: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const dateFilter =
    input.dateRange?.from || input.dateRange?.to
      ? {
          createdAt: {
            ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
            ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
          },
        }
      : null;

  // If date filter is specified, get use case counts with date constraint
  let useCaseCountsByOrg: Map<string, { total: number; byStatus: Record<string, number> }> | null =
    null;
  if (dateFilter) {
    const filteredUseCases = await prisma.useCaseOrganization.findMany({
      where: {
        organizationId: orgWhere.id ? (orgWhere.id as { in: string[] }) : undefined,
        useCase: dateFilter,
      },
      select: {
        organizationId: true,
        useCase: { select: { status: true } },
      },
    });

    useCaseCountsByOrg = new Map();
    for (const ucOrg of filteredUseCases) {
      if (!useCaseCountsByOrg.has(ucOrg.organizationId)) {
        useCaseCountsByOrg.set(ucOrg.organizationId, { total: 0, byStatus: {} });
      }
      const entry = useCaseCountsByOrg.get(ucOrg.organizationId)!;
      entry.total += 1;
      entry.byStatus[ucOrg.useCase.status] = (entry.byStatus[ucOrg.useCase.status] ?? 0) + 1;
    }
  }

  const orgActivities = organizations.map((org) => {
    let useCaseCount: number;
    let useCaseStatusBreakdown: Record<string, number>;

    if (useCaseCountsByOrg) {
      const filtered = useCaseCountsByOrg.get(org.id);
      useCaseCount = filtered?.total ?? 0;
      useCaseStatusBreakdown = filtered?.byStatus ?? {};
    } else {
      useCaseStatusBreakdown = {};
      for (const ucOrg of org.useCases) {
        const status = ucOrg.useCase.status;
        useCaseStatusBreakdown[status] = (useCaseStatusBreakdown[status] ?? 0) + 1;
      }
      useCaseCount = org.useCases.length;
    }

    return {
      organizationId: org.id,
      organizationName: org.name,
      industry: org.industry,
      relationshipStatus: org.relationshipStatus,
      ndaStatus: org.ndaStatus,
      contactCount: org.contacts.length,
      useCaseCount,
      useCaseStatusBreakdown,
      managerCount: org.managers.length,
    };
  });

  const relationshipStatusBreakdown: Record<string, number> = {};
  for (const org of orgActivities) {
    relationshipStatusBreakdown[org.relationshipStatus] =
      (relationshipStatusBreakdown[org.relationshipStatus] ?? 0) + 1;
  }

  const totals = {
    totalOrganizations: orgActivities.length,
    totalContacts: orgActivities.reduce((sum, o) => sum + o.contactCount, 0),
    totalUseCases: orgActivities.reduce((sum, o) => sum + o.useCaseCount, 0),
    relationshipStatusBreakdown,
  };

  childLogger.info(
    { orgCount: orgActivities.length, totalUseCases: totals.totalUseCases },
    "Organization activity report generated",
  );

  return {
    organizations: orgActivities,
    totals,
    generatedAt: new Date().toISOString(),
  };
}
