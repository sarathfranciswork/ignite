import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma, type UseCaseStatus } from "@prisma/client";
import {
  isValidUseCaseTransition,
  getValidUseCaseTransitions,
  getUseCaseTransitionGuards,
  USE_CASE_STATUS_LABELS,
  USE_CASE_GUARD_FAILURE_MESSAGES,
} from "@/server/lib/state-machines/use-case-transitions";
import type {
  UseCaseListInput,
  UseCaseCreateInput,
  UseCaseUpdateInput,
  UseCaseTransitionInput,
  UseCaseTeamMemberInput,
  UseCaseOrganizationLinkInput,
  UseCaseTaskCreateInput,
  UseCaseTaskUpdateInput,
  UseCaseTaskListInput,
  UseCaseFunnelInput,
} from "./use-case.schemas";

const userSelect = { id: true, name: true, email: true, image: true } as const;

const useCaseInclude = {
  owner: { select: userSelect },
  createdBy: { select: userSelect },
  teamMembers: {
    include: { user: { select: userSelect } },
    orderBy: { assignedAt: "asc" as const },
  },
  organizations: {
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          industry: true,
          relationshipStatus: true,
          logoUrl: true,
        },
      },
    },
  },
  _count: { select: { tasks: true } },
} as const;

type UseCaseWithRelations = Prisma.UseCaseGetPayload<{ include: typeof useCaseInclude }>;

function mapUseCaseToResponse(uc: UseCaseWithRelations) {
  return {
    id: uc.id,
    title: uc.title,
    problemDescription: uc.problemDescription,
    suggestedSolution: uc.suggestedSolution,
    benefit: uc.benefit,
    status: uc.status,
    previousStatus: uc.previousStatus,
    owner: uc.owner,
    createdBy: uc.createdBy,
    teamMembers: uc.teamMembers.map((tm) => ({
      id: tm.id,
      role: tm.role,
      user: tm.user,
      assignedAt: tm.assignedAt.toISOString(),
    })),
    organizations: uc.organizations.map((o) => ({
      id: o.id,
      organization: o.organization,
    })),
    taskCount: uc._count.tasks,
    createdAt: uc.createdAt.toISOString(),
    updatedAt: uc.updatedAt.toISOString(),
  };
}

const childLogger = logger.child({ service: "useCase" });

export async function listUseCases(input: UseCaseListInput) {
  const where: Prisma.UseCaseWhereInput = {};

  if (input.status) {
    where.status = input.status;
  }

  if (input.ownerId) {
    where.ownerId = input.ownerId;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { problemDescription: { contains: input.search, mode: "insensitive" } },
      { benefit: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.useCase.findMany({
    where,
    include: useCaseInclude,
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map(mapUseCaseToResponse),
    nextCursor,
  };
}

export async function getUseCaseById(id: string) {
  const uc = await prisma.useCase.findUnique({
    where: { id },
    include: {
      ...useCaseInclude,
      tasks: {
        include: { assignee: { select: userSelect } },
        orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!uc) {
    throw new UseCaseServiceError("Use case not found", "USE_CASE_NOT_FOUND");
  }

  return {
    ...mapUseCaseToResponse(uc),
    tasks: uc.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      assignee: t.assignee,
      dueDate: t.dueDate?.toISOString() ?? null,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  };
}

export async function createUseCase(input: UseCaseCreateInput, actorId: string) {
  const uc = await prisma.useCase.create({
    data: {
      title: input.title,
      problemDescription: input.problemDescription,
      suggestedSolution: input.suggestedSolution,
      benefit: input.benefit,
      ownerId: actorId,
      createdById: actorId,
      teamMembers: {
        create: { userId: actorId, role: "LEAD" },
      },
      ...(input.organizationIds && input.organizationIds.length > 0
        ? {
            organizations: {
              create: input.organizationIds.map((orgId) => ({ organizationId: orgId })),
            },
          }
        : {}),
    },
    include: useCaseInclude,
  });

  childLogger.info({ useCaseId: uc.id, actorId }, "Use case created");

  eventBus.emit("useCase.created", {
    entity: "useCase",
    entityId: uc.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: uc.title },
  });

  return mapUseCaseToResponse(uc);
}

export async function updateUseCase(input: UseCaseUpdateInput, actorId: string) {
  const existing = await prisma.useCase.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new UseCaseServiceError("Use case not found", "USE_CASE_NOT_FOUND");
  }

  const data: Prisma.UseCaseUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.problemDescription !== undefined) data.problemDescription = input.problemDescription;
  if (input.suggestedSolution !== undefined) data.suggestedSolution = input.suggestedSolution;
  if (input.benefit !== undefined) data.benefit = input.benefit;

  const uc = await prisma.useCase.update({
    where: { id: input.id },
    data,
    include: useCaseInclude,
  });

  childLogger.info({ useCaseId: uc.id, actorId }, "Use case updated");

  eventBus.emit("useCase.updated", {
    entity: "useCase",
    entityId: uc.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(data) },
  });

  return mapUseCaseToResponse(uc);
}

export async function transitionUseCase(input: UseCaseTransitionInput, actorId: string) {
  const uc = await prisma.useCase.findUnique({
    where: { id: input.id },
    include: {
      _count: {
        select: { organizations: true, teamMembers: true },
      },
    },
  });

  if (!uc) {
    throw new UseCaseServiceError("Use case not found", "USE_CASE_NOT_FOUND");
  }

  if (!isValidUseCaseTransition(uc.status, input.targetStatus)) {
    const currentLabel = USE_CASE_STATUS_LABELS[uc.status];
    const targetLabel = USE_CASE_STATUS_LABELS[input.targetStatus];
    throw new UseCaseServiceError(
      `Cannot transition from ${currentLabel} to ${targetLabel}`,
      "INVALID_TRANSITION",
    );
  }

  const guards = getUseCaseTransitionGuards(uc.status, input.targetStatus);
  for (const guard of guards) {
    if (guard === "HAS_LINKED_ORGANIZATION" && uc._count.organizations === 0) {
      throw new UseCaseServiceError(
        USE_CASE_GUARD_FAILURE_MESSAGES.HAS_LINKED_ORGANIZATION,
        "GUARD_FAILED",
      );
    }
    if (guard === "HAS_TEAM_ASSIGNED" && uc._count.teamMembers < 2) {
      throw new UseCaseServiceError(
        USE_CASE_GUARD_FAILURE_MESSAGES.HAS_TEAM_ASSIGNED,
        "GUARD_FAILED",
      );
    }
  }

  const updated = await prisma.useCase.update({
    where: { id: input.id },
    data: {
      previousStatus: uc.status,
      status: input.targetStatus,
    },
    include: useCaseInclude,
  });

  childLogger.info(
    { useCaseId: uc.id, from: uc.status, to: input.targetStatus, actorId },
    "Use case transitioned",
  );

  eventBus.emit("useCase.statusChanged", {
    entity: "useCase",
    entityId: uc.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { from: uc.status, to: input.targetStatus },
  });

  return mapUseCaseToResponse(updated);
}

export async function getUseCaseTransitions(id: string) {
  const uc = await prisma.useCase.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!uc) {
    throw new UseCaseServiceError("Use case not found", "USE_CASE_NOT_FOUND");
  }

  return getValidUseCaseTransitions(uc.status).map((status) => ({
    status,
    label: USE_CASE_STATUS_LABELS[status],
  }));
}

export async function deleteUseCase(id: string, actorId: string) {
  const existing = await prisma.useCase.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) {
    throw new UseCaseServiceError("Use case not found", "USE_CASE_NOT_FOUND");
  }

  await prisma.useCase.delete({ where: { id } });
  childLogger.info({ useCaseId: id, actorId }, "Use case deleted");

  eventBus.emit("useCase.deleted", {
    entity: "useCase",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title },
  });

  return { id };
}

// ── Team Member Operations ──────────────────────────────

export async function addTeamMember(input: UseCaseTeamMemberInput, actorId: string) {
  const uc = await prisma.useCase.findUnique({
    where: { id: input.useCaseId },
    select: { id: true },
  });
  if (!uc) {
    throw new UseCaseServiceError("Use case not found", "USE_CASE_NOT_FOUND");
  }

  const existing = await prisma.useCaseTeamMember.findUnique({
    where: { useCaseId_userId: { useCaseId: input.useCaseId, userId: input.userId } },
  });
  if (existing) {
    throw new UseCaseServiceError("User is already a team member", "DUPLICATE_TEAM_MEMBER");
  }

  const member = await prisma.useCaseTeamMember.create({
    data: {
      useCaseId: input.useCaseId,
      userId: input.userId,
      role: input.role,
    },
    include: { user: { select: userSelect } },
  });

  childLogger.info(
    { useCaseId: input.useCaseId, userId: input.userId, actorId },
    "Team member added",
  );

  eventBus.emit("useCase.teamMemberAdded", {
    entity: "useCase",
    entityId: input.useCaseId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId: input.userId, role: input.role },
  });

  return {
    id: member.id,
    role: member.role,
    user: member.user,
    assignedAt: member.assignedAt.toISOString(),
  };
}

export async function removeTeamMember(useCaseId: string, userId: string, actorId: string) {
  const member = await prisma.useCaseTeamMember.findUnique({
    where: { useCaseId_userId: { useCaseId, userId } },
  });
  if (!member) {
    throw new UseCaseServiceError("Team member not found", "TEAM_MEMBER_NOT_FOUND");
  }

  await prisma.useCaseTeamMember.delete({
    where: { useCaseId_userId: { useCaseId, userId } },
  });

  childLogger.info({ useCaseId, userId, actorId }, "Team member removed");

  eventBus.emit("useCase.teamMemberRemoved", {
    entity: "useCase",
    entityId: useCaseId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId },
  });

  return { useCaseId, userId };
}

// ── Organization Link Operations ─────────────────────────

export async function linkOrganization(input: UseCaseOrganizationLinkInput, actorId: string) {
  const uc = await prisma.useCase.findUnique({
    where: { id: input.useCaseId },
    select: { id: true },
  });
  if (!uc) {
    throw new UseCaseServiceError("Use case not found", "USE_CASE_NOT_FOUND");
  }

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, name: true },
  });
  if (!org) {
    throw new UseCaseServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  const existing = await prisma.useCaseOrganization.findUnique({
    where: {
      useCaseId_organizationId: {
        useCaseId: input.useCaseId,
        organizationId: input.organizationId,
      },
    },
  });
  if (existing) {
    throw new UseCaseServiceError("Organization is already linked", "DUPLICATE_ORGANIZATION_LINK");
  }

  const link = await prisma.useCaseOrganization.create({
    data: {
      useCaseId: input.useCaseId,
      organizationId: input.organizationId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          industry: true,
          relationshipStatus: true,
          logoUrl: true,
        },
      },
    },
  });

  childLogger.info(
    { useCaseId: input.useCaseId, organizationId: input.organizationId, actorId },
    "Organization linked",
  );

  eventBus.emit("useCase.organizationLinked", {
    entity: "useCase",
    entityId: input.useCaseId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { organizationId: input.organizationId, name: org.name },
  });

  return { id: link.id, organization: link.organization };
}

export async function unlinkOrganization(
  useCaseId: string,
  organizationId: string,
  actorId: string,
) {
  const link = await prisma.useCaseOrganization.findUnique({
    where: { useCaseId_organizationId: { useCaseId, organizationId } },
  });
  if (!link) {
    throw new UseCaseServiceError("Organization link not found", "ORGANIZATION_LINK_NOT_FOUND");
  }

  await prisma.useCaseOrganization.delete({
    where: { useCaseId_organizationId: { useCaseId, organizationId } },
  });

  childLogger.info({ useCaseId, organizationId, actorId }, "Organization unlinked");

  eventBus.emit("useCase.organizationUnlinked", {
    entity: "useCase",
    entityId: useCaseId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { organizationId },
  });

  return { useCaseId, organizationId };
}

// ── Task Operations ─────────────────────────────────────

export async function listTasks(input: UseCaseTaskListInput) {
  const where: Prisma.UseCaseTaskWhereInput = { useCaseId: input.useCaseId };
  if (input.status) {
    where.status = input.status;
  }

  const tasks = await prisma.useCaseTask.findMany({
    where,
    include: { assignee: { select: userSelect } },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return tasks.map((t) => ({
    id: t.id,
    useCaseId: t.useCaseId,
    title: t.title,
    description: t.description,
    status: t.status,
    assignee: t.assignee,
    dueDate: t.dueDate?.toISOString() ?? null,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function createTask(input: UseCaseTaskCreateInput, actorId: string) {
  const uc = await prisma.useCase.findUnique({
    where: { id: input.useCaseId },
    select: { id: true },
  });
  if (!uc) {
    throw new UseCaseServiceError("Use case not found", "USE_CASE_NOT_FOUND");
  }

  const task = await prisma.useCaseTask.create({
    data: {
      useCaseId: input.useCaseId,
      title: input.title,
      description: input.description,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      status: input.status,
    },
    include: { assignee: { select: userSelect } },
  });

  childLogger.info({ useCaseId: input.useCaseId, taskId: task.id, actorId }, "Task created");

  eventBus.emit("useCaseTask.created", {
    entity: "useCaseTask",
    entityId: task.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { useCaseId: input.useCaseId, title: task.title },
  });

  return {
    id: task.id,
    useCaseId: task.useCaseId,
    title: task.title,
    description: task.description,
    status: task.status,
    assignee: task.assignee,
    dueDate: task.dueDate?.toISOString() ?? null,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function updateTask(input: UseCaseTaskUpdateInput, actorId: string) {
  const existing = await prisma.useCaseTask.findUnique({
    where: { id: input.id },
    select: { id: true, useCaseId: true, status: true },
  });
  if (!existing) {
    throw new UseCaseServiceError("Task not found", "TASK_NOT_FOUND");
  }

  const data: Prisma.UseCaseTaskUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.assigneeId !== undefined) {
    data.assignee = input.assigneeId ? { connect: { id: input.assigneeId } } : { disconnect: true };
  }
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  const statusChanged = input.status !== undefined && input.status !== existing.status;
  if (input.status !== undefined) data.status = input.status;

  const task = await prisma.useCaseTask.update({
    where: { id: input.id },
    data,
    include: { assignee: { select: userSelect } },
  });

  childLogger.info({ taskId: task.id, actorId }, "Task updated");

  const eventName = statusChanged ? "useCaseTask.statusChanged" : "useCaseTask.updated";
  eventBus.emit(eventName, {
    entity: "useCaseTask",
    entityId: task.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      useCaseId: existing.useCaseId,
      ...(statusChanged ? { from: existing.status, to: input.status } : {}),
    },
  });

  return {
    id: task.id,
    useCaseId: task.useCaseId,
    title: task.title,
    description: task.description,
    status: task.status,
    assignee: task.assignee,
    dueDate: task.dueDate?.toISOString() ?? null,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function deleteTask(id: string, actorId: string) {
  const existing = await prisma.useCaseTask.findUnique({
    where: { id },
    select: { id: true, useCaseId: true, title: true },
  });
  if (!existing) {
    throw new UseCaseServiceError("Task not found", "TASK_NOT_FOUND");
  }

  await prisma.useCaseTask.delete({ where: { id } });
  childLogger.info({ taskId: id, actorId }, "Task deleted");

  eventBus.emit("useCaseTask.deleted", {
    entity: "useCaseTask",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { useCaseId: existing.useCaseId, title: existing.title },
  });

  return { id };
}

// ── Funnel / Pipeline Stats ──────────────────────────────

export async function getUseCaseFunnel(input: UseCaseFunnelInput) {
  const where: Prisma.UseCaseWhereInput = {};
  if (input.ownerId) {
    where.ownerId = input.ownerId;
  }

  const counts = await prisma.useCase.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const statusOrder: UseCaseStatus[] = [
    "IDENTIFIED",
    "QUALIFICATION",
    "EVALUATION",
    "PILOT",
    "PARTNERSHIP",
  ];

  return statusOrder.map((status) => {
    const found = counts.find((c) => c.status === status);
    return {
      status,
      label: USE_CASE_STATUS_LABELS[status],
      count: found?._count._all ?? 0,
    };
  });
}

export class UseCaseServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "UseCaseServiceError";
  }
}
