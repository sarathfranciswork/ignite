import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  ProjectListInput,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectAddTeamMemberInput,
  ProjectRemoveTeamMemberInput,
} from "./project.schemas";

const childLogger = logger.child({ service: "project" });

export class ProjectServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectServiceError";
  }
}

const detailInclude = {
  processDefinition: {
    include: {
      phases: {
        orderBy: { position: "asc" as const },
        include: {
          activities: {
            orderBy: { position: "asc" as const },
            include: {
              tasks: {
                orderBy: { position: "asc" as const },
              },
            },
          },
        },
      },
    },
  },
  currentPhase: true,
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  sourceIdea: {
    select: { id: true, title: true },
  },
  teamMembers: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const listInclude = {
  processDefinition: {
    select: { id: true, name: true },
  },
  currentPhase: {
    select: { id: true, name: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  sourceIdea: {
    select: { id: true, title: true },
  },
  _count: {
    select: { teamMembers: true },
  },
} as const;

export async function listProjects(input: ProjectListInput) {
  const where: Prisma.ProjectWhereInput = {};

  if (input.status) {
    where.status = input.status;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const sortBy = input.sortBy ?? "updatedAt";
  const sortDirection = input.sortDirection ?? "desc";
  const limit = input.limit ?? 20;
  const orderBy: Prisma.ProjectOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.project.findMany({
    where,
    include: listInclude,
    orderBy,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | undefined;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      isConfidential: item.isConfidential,
      processDefinition: item.processDefinition,
      currentPhase: item.currentPhase,
      createdBy: item.createdBy,
      sourceIdea: item.sourceIdea,
      teamMemberCount: item._count.teamMembers,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: detailInclude,
  });

  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${id} not found`);
  }

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    isConfidential: project.isConfidential,
    processDefinition: {
      id: project.processDefinition.id,
      name: project.processDefinition.name,
      phases: project.processDefinition.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        description: phase.description,
        plannedDurationDays: phase.plannedDurationDays,
        position: phase.position,
        activities: phase.activities.map((activity) => ({
          id: activity.id,
          name: activity.name,
          description: activity.description,
          isMandatory: activity.isMandatory,
          position: activity.position,
          tasks: activity.tasks.map((task) => ({
            id: task.id,
            name: task.name,
            fieldType: task.fieldType,
            isMandatory: task.isMandatory,
            position: task.position,
          })),
        })),
      })),
    },
    currentPhase: project.currentPhase
      ? { id: project.currentPhase.id, name: project.currentPhase.name }
      : null,
    createdBy: project.createdBy,
    sourceIdea: project.sourceIdea,
    teamMembers: project.teamMembers.map((tm) => ({
      id: tm.id,
      role: tm.role,
      user: tm.user,
      createdAt: tm.createdAt.toISOString(),
    })),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function createProject(input: ProjectCreateInput, userId: string) {
  const processDefinition = await prisma.processDefinition.findUnique({
    where: { id: input.processDefinitionId },
    include: {
      phases: {
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  });

  if (!processDefinition) {
    throw new ProjectServiceError(
      "PROCESS_DEFINITION_NOT_FOUND",
      `Process definition ${input.processDefinitionId} not found`,
    );
  }

  if (input.sourceIdeaId) {
    const idea = await prisma.idea.findUnique({
      where: { id: input.sourceIdeaId },
    });
    if (!idea) {
      throw new ProjectServiceError("IDEA_NOT_FOUND", `Idea ${input.sourceIdeaId} not found`);
    }
  }

  const firstPhase = processDefinition.phases[0];

  const project = await prisma.project.create({
    data: {
      title: input.title,
      description: input.description,
      processDefinitionId: input.processDefinitionId,
      currentPhaseId: firstPhase?.id ?? null,
      createdById: userId,
      sourceIdeaId: input.sourceIdeaId,
      teamMembers: {
        create: (input.teamMembers ?? []).map((tm) => ({
          userId: tm.userId,
          role: tm.role,
        })),
      },
    },
  });

  eventBus.emit("project.created", {
    entity: "Project",
    entityId: project.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      processDefinitionId: input.processDefinitionId,
      sourceIdeaId: input.sourceIdeaId,
    },
  });

  childLogger.info({ projectId: project.id }, "Project created");

  return getProjectById(project.id);
}

export async function updateProject(input: ProjectUpdateInput, userId: string) {
  const existing = await prisma.project.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.id} not found`);
  }

  const updateData: Prisma.ProjectUpdateInput = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;

  await prisma.project.update({
    where: { id: input.id },
    data: updateData,
  });

  eventBus.emit("project.updated", {
    entity: "Project",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ projectId: input.id }, "Project updated");

  return getProjectById(input.id);
}

export async function deleteProject(id: string, _userId: string) {
  const existing = await prisma.project.findUnique({ where: { id } });

  if (!existing) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${id} not found`);
  }

  await prisma.project.delete({ where: { id } });

  childLogger.info({ projectId: id }, "Project deleted");

  return { id };
}

export async function addTeamMember(input: ProjectAddTeamMemberInput, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.projectId} not found`);
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new ProjectServiceError("USER_NOT_FOUND", `User ${input.userId} not found`);
  }

  const existingMember = await prisma.projectTeamMember.findUnique({
    where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
  });

  if (existingMember) {
    throw new ProjectServiceError(
      "MEMBER_ALREADY_EXISTS",
      `User ${input.userId} is already a team member`,
    );
  }

  await prisma.projectTeamMember.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      role: input.role,
    },
  });

  eventBus.emit("project.teamMemberAdded", {
    entity: "Project",
    entityId: input.projectId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { addedUserId: input.userId, role: input.role },
  });

  childLogger.info({ projectId: input.projectId, addedUserId: input.userId }, "Team member added");

  return getProjectById(input.projectId);
}

export async function removeTeamMember(input: ProjectRemoveTeamMemberInput, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.projectId} not found`);
  }

  const existingMember = await prisma.projectTeamMember.findUnique({
    where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
  });

  if (!existingMember) {
    throw new ProjectServiceError(
      "MEMBER_NOT_FOUND",
      `User ${input.userId} is not a team member of this project`,
    );
  }

  await prisma.projectTeamMember.delete({
    where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
  });

  eventBus.emit("project.teamMemberRemoved", {
    entity: "Project",
    entityId: input.projectId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { removedUserId: input.userId },
  });

  childLogger.info(
    { projectId: input.projectId, removedUserId: input.userId },
    "Team member removed",
  );

  return getProjectById(input.projectId);
}
