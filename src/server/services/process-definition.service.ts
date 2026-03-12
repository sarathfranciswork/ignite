import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  ProcessDefinitionListInput,
  ProcessDefinitionCreateInput,
  ProcessDefinitionUpdateInput,
  ProcessDefinitionDuplicateInput,
} from "./process-definition.schemas";

const childLogger = logger.child({ service: "process-definition" });

export class ProcessDefinitionServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProcessDefinitionServiceError";
  }
}

const fullInclude = {
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
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  _count: {
    select: { projects: true },
  },
} as const;

const listInclude = {
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  _count: {
    select: { phases: true, projects: true },
  },
} as const;

export async function listProcessDefinitions(input: ProcessDefinitionListInput) {
  const where: Prisma.ProcessDefinitionWhereInput = {};

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const sortBy = input.sortBy ?? "updatedAt";
  const sortDirection = input.sortDirection ?? "desc";
  const limit = input.limit ?? 20;
  const orderBy: Prisma.ProcessDefinitionOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.processDefinition.findMany({
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
      name: item.name,
      description: item.description,
      phaseCount: item._count.phases,
      projectCount: item._count.projects,
      createdBy: item.createdBy,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getProcessDefinitionById(id: string) {
  const definition = await prisma.processDefinition.findUnique({
    where: { id },
    include: fullInclude,
  });

  if (!definition) {
    throw new ProcessDefinitionServiceError(
      "PROCESS_DEFINITION_NOT_FOUND",
      `Process definition ${id} not found`,
    );
  }

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    projectCount: definition._count.projects,
    createdBy: definition.createdBy,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
    phases: definition.phases.map((phase) => ({
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
  };
}

export async function createProcessDefinition(input: ProcessDefinitionCreateInput, userId: string) {
  const definition = await prisma.processDefinition.create({
    data: {
      name: input.name,
      description: input.description,
      createdById: userId,
      phases: {
        create: (input.phases ?? []).map((phase) => ({
          name: phase.name,
          description: phase.description,
          plannedDurationDays: phase.plannedDurationDays,
          position: phase.position,
          activities: {
            create: (phase.activities ?? []).map((activity) => ({
              name: activity.name,
              description: activity.description,
              isMandatory: activity.isMandatory,
              position: activity.position,
              tasks: {
                create: (activity.tasks ?? []).map((task) => ({
                  name: task.name,
                  fieldType: task.fieldType,
                  isMandatory: task.isMandatory,
                  position: task.position,
                })),
              },
            })),
          },
        })),
      },
    },
    include: fullInclude,
  });

  eventBus.emit("processDefinition.created", {
    entity: "ProcessDefinition",
    entityId: definition.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ processDefinitionId: definition.id }, "Process definition created");

  return getProcessDefinitionById(definition.id);
}

export async function updateProcessDefinition(input: ProcessDefinitionUpdateInput, userId: string) {
  const existing = await prisma.processDefinition.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new ProcessDefinitionServiceError(
      "PROCESS_DEFINITION_NOT_FOUND",
      `Process definition ${input.id} not found`,
    );
  }

  const updateData: Prisma.ProcessDefinitionUpdateInput = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;

  await prisma.processDefinition.update({
    where: { id: input.id },
    data: updateData,
  });

  eventBus.emit("processDefinition.updated", {
    entity: "ProcessDefinition",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ processDefinitionId: input.id }, "Process definition updated");

  return getProcessDefinitionById(input.id);
}

export async function deleteProcessDefinition(id: string, userId: string) {
  const existing = await prisma.processDefinition.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });

  if (!existing) {
    throw new ProcessDefinitionServiceError(
      "PROCESS_DEFINITION_NOT_FOUND",
      `Process definition ${id} not found`,
    );
  }

  if (existing._count.projects > 0) {
    throw new ProcessDefinitionServiceError(
      "PROCESS_DEFINITION_IN_USE",
      `Cannot delete process definition that has ${existing._count.projects} active project(s)`,
    );
  }

  await prisma.processDefinition.delete({ where: { id } });

  eventBus.emit("processDefinition.deleted", {
    entity: "ProcessDefinition",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ processDefinitionId: id }, "Process definition deleted");

  return { id };
}

export async function duplicateProcessDefinition(
  input: ProcessDefinitionDuplicateInput,
  userId: string,
) {
  const original = await prisma.processDefinition.findUnique({
    where: { id: input.id },
    include: fullInclude,
  });

  if (!original) {
    throw new ProcessDefinitionServiceError(
      "PROCESS_DEFINITION_NOT_FOUND",
      `Process definition ${input.id} not found`,
    );
  }

  const duplicate = await prisma.processDefinition.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      createdById: userId,
      phases: {
        create: original.phases.map((phase) => ({
          name: phase.name,
          description: phase.description,
          plannedDurationDays: phase.plannedDurationDays,
          position: phase.position,
          activities: {
            create: phase.activities.map((activity) => ({
              name: activity.name,
              description: activity.description,
              isMandatory: activity.isMandatory,
              position: activity.position,
              tasks: {
                create: activity.tasks.map((task) => ({
                  name: task.name,
                  fieldType: task.fieldType,
                  isMandatory: task.isMandatory,
                  position: task.position,
                })),
              },
            })),
          },
        })),
      },
    },
    include: fullInclude,
  });

  eventBus.emit("processDefinition.duplicated", {
    entity: "ProcessDefinition",
    entityId: duplicate.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { sourceId: input.id },
  });

  childLogger.info(
    { processDefinitionId: duplicate.id, sourceId: input.id },
    "Process definition duplicated",
  );

  return getProcessDefinitionById(duplicate.id);
}
