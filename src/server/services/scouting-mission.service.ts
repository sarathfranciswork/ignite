import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type { ScoutingMissionStatus } from "@prisma/client";
import { isValidScoutingMissionTransition } from "@/server/lib/state-machines/scouting-mission-transitions";
import type {
  ScoutingMissionListInput,
  ScoutingMissionCreateInput,
  ScoutingMissionUpdateInput,
  ScoutingMissionTransitionInput,
  ScoutingMissionAssignScoutsInput,
  ScoutingMissionRemoveScoutInput,
} from "./scouting-mission.schemas";

const childLogger = logger.child({ service: "scouting-mission" });

// ── Error Class ──────────────────────────────────────────────

export class ScoutingMissionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ScoutingMissionServiceError";
  }
}

// ── Prisma Includes ──────────────────────────────────────────

const scoutInclude = {
  include: {
    user: { select: { id: true, name: true, email: true, image: true } },
  },
} satisfies Prisma.ScoutingMissionScoutFindManyArgs;

const missionDetailInclude = {
  createdBy: { select: { id: true, name: true, email: true, image: true } },
  scouts: scoutInclude,
  board: {
    select: {
      id: true,
      title: true,
      _count: { select: { cards: true } },
    },
  },
} as const;

const missionListInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  scouts: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
  board: {
    select: {
      id: true,
      title: true,
      _count: { select: { cards: true } },
    },
  },
  _count: { select: { scouts: true } },
} as const;

type MissionWithDetail = Prisma.ScoutingMissionGetPayload<{
  include: typeof missionDetailInclude;
}>;

type MissionWithList = Prisma.ScoutingMissionGetPayload<{
  include: typeof missionListInclude;
}>;

// ── Response Mappers ─────────────────────────────────────────

function mapMissionListResponse(mission: MissionWithList) {
  return {
    id: mission.id,
    title: mission.title,
    problemStatement: mission.problemStatement,
    targetIndustries: mission.targetIndustries,
    targetRegions: mission.targetRegions,
    deadline: mission.deadline?.toISOString() ?? null,
    status: mission.status,
    scoutCount: mission._count.scouts,
    scouts: mission.scouts.map((s) => ({
      id: s.id,
      user: s.user,
      assignedAt: s.assignedAt.toISOString(),
    })),
    board: mission.board
      ? {
          id: mission.board.id,
          title: mission.board.title,
          cardCount: mission.board._count.cards,
        }
      : null,
    createdBy: mission.createdBy,
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),
  };
}

function mapMissionDetailResponse(mission: MissionWithDetail) {
  return {
    id: mission.id,
    title: mission.title,
    problemStatement: mission.problemStatement,
    requirements: mission.requirements as Record<string, unknown>[] | null,
    targetIndustries: mission.targetIndustries,
    targetRegions: mission.targetRegions,
    deadline: mission.deadline?.toISOString() ?? null,
    status: mission.status,
    previousStatus: mission.previousStatus,
    scouts: mission.scouts.map((s) => ({
      id: s.id,
      user: s.user,
      assignedAt: s.assignedAt.toISOString(),
    })),
    board: mission.board
      ? {
          id: mission.board.id,
          title: mission.board.title,
          cardCount: mission.board._count.cards,
        }
      : null,
    createdBy: mission.createdBy,
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),
  };
}

// ── Mission CRUD ─────────────────────────────────────────────

export async function listScoutingMissions(input: ScoutingMissionListInput, userId: string) {
  const limit = input.limit ?? 20;

  const where: Prisma.ScoutingMissionWhereInput = {
    ...(input.status ? { status: input.status as ScoutingMissionStatus } : {}),
    ...(input.search
      ? {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            { problemStatement: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    OR: [{ createdById: userId }, { scouts: { some: { userId } } }],
  };

  // When search filter is combined with the base OR, we need to restructure
  const finalWhere: Prisma.ScoutingMissionWhereInput = input.search
    ? {
        AND: [
          {
            OR: [
              { title: { contains: input.search, mode: "insensitive" as const } },
              { problemStatement: { contains: input.search, mode: "insensitive" as const } },
            ],
          },
          {
            OR: [{ createdById: userId }, { scouts: { some: { userId } } }],
          },
          ...(input.status ? [{ status: input.status as ScoutingMissionStatus }] : []),
        ],
      }
    : where;

  const orderBy: Prisma.ScoutingMissionOrderByWithRelationInput = {
    [input.sortBy ?? "createdAt"]: input.sortDirection ?? "desc",
  };

  const items = await prisma.scoutingMission.findMany({
    where: finalWhere,
    include: missionListInclude,
    take: limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy,
  });

  let nextCursor: string | undefined;
  if (items.length > limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map(mapMissionListResponse),
    nextCursor,
  };
}

export async function getScoutingMissionById(id: string, userId: string) {
  const mission = await prisma.scoutingMission.findUnique({
    where: { id },
    include: missionDetailInclude,
  });

  if (!mission) {
    throw new ScoutingMissionServiceError("Scouting mission not found", "MISSION_NOT_FOUND");
  }

  const isCreator = mission.createdBy.id === userId;
  const isScout = mission.scouts.some((s) => s.user.id === userId);

  if (!isCreator && !isScout) {
    throw new ScoutingMissionServiceError(
      "You do not have access to this mission",
      "MISSION_ACCESS_DENIED",
    );
  }

  return mapMissionDetailResponse(mission);
}

export async function createScoutingMission(input: ScoutingMissionCreateInput, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    // Create a linked scouting board automatically
    const board = await tx.scoutingBoard.create({
      data: {
        title: `${input.title} - Scouting Board`,
        description: `Linked board for scouting mission: ${input.title}`,
        createdById: actorId,
        columns: {
          create: [
            { name: "Long List", color: "#6366f1", sortOrder: 0 },
            { name: "Evaluating", color: "#f59e0b", sortOrder: 1 },
            { name: "Short List", color: "#22c55e", sortOrder: 2 },
            { name: "Archived", color: "#6b7280", sortOrder: 3 },
          ],
        },
      },
    });

    const mission = await tx.scoutingMission.create({
      data: {
        title: input.title,
        problemStatement: input.problemStatement,
        requirements: input.requirements
          ? (input.requirements as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        targetIndustries: input.targetIndustries,
        targetRegions: input.targetRegions,
        deadline: input.deadline ? new Date(input.deadline) : null,
        createdById: actorId,
        boardId: board.id,
        scouts: {
          create: input.scoutIds.map((userId) => ({ userId })),
        },
      },
      include: missionDetailInclude,
    });

    // Share the board with assigned scouts
    if (input.scoutIds.length > 0) {
      await tx.scoutingBoardShare.createMany({
        data: input.scoutIds.map((userId) => ({
          boardId: board.id,
          userId,
          role: "EDITOR" as const,
        })),
        skipDuplicates: true,
      });
    }

    return mission;
  });

  childLogger.info({ missionId: result.id, actorId }, "Scouting mission created");

  eventBus.emit("scoutingMission.created", {
    entity: "scoutingMission",
    entityId: result.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: result.title },
  });

  return mapMissionDetailResponse(result);
}

export async function updateScoutingMission(input: ScoutingMissionUpdateInput, actorId: string) {
  const existing = await prisma.scoutingMission.findUnique({
    where: { id: input.id },
    select: { createdById: true },
  });

  if (!existing) {
    throw new ScoutingMissionServiceError("Scouting mission not found", "MISSION_NOT_FOUND");
  }

  if (existing.createdById !== actorId) {
    throw new ScoutingMissionServiceError(
      "Only the mission creator can update it",
      "MISSION_NOT_OWNER",
    );
  }

  const data: Prisma.ScoutingMissionUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.problemStatement !== undefined) data.problemStatement = input.problemStatement;
  if (input.requirements !== undefined) {
    data.requirements =
      input.requirements === null
        ? Prisma.JsonNull
        : (input.requirements as unknown as Prisma.InputJsonValue);
  }
  if (input.targetIndustries !== undefined) data.targetIndustries = input.targetIndustries;
  if (input.targetRegions !== undefined) data.targetRegions = input.targetRegions;
  if (input.deadline !== undefined) {
    data.deadline = input.deadline === null ? null : new Date(input.deadline);
  }

  const mission = await prisma.scoutingMission.update({
    where: { id: input.id },
    data,
    include: missionDetailInclude,
  });

  childLogger.info({ missionId: mission.id, actorId }, "Scouting mission updated");

  eventBus.emit("scoutingMission.updated", {
    entity: "scoutingMission",
    entityId: mission.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: mission.title },
  });

  return mapMissionDetailResponse(mission);
}

export async function deleteScoutingMission(id: string, actorId: string) {
  const mission = await prisma.scoutingMission.findUnique({
    where: { id },
    select: { createdById: true, title: true },
  });

  if (!mission) {
    throw new ScoutingMissionServiceError("Scouting mission not found", "MISSION_NOT_FOUND");
  }

  if (mission.createdById !== actorId) {
    throw new ScoutingMissionServiceError(
      "Only the mission creator can delete it",
      "MISSION_NOT_OWNER",
    );
  }

  await prisma.scoutingMission.delete({ where: { id } });

  childLogger.info({ missionId: id, actorId }, "Scouting mission deleted");

  eventBus.emit("scoutingMission.deleted", {
    entity: "scoutingMission",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: mission.title },
  });

  return { success: true };
}

// ── Status Transitions ──────────────────────────────────────

export async function transitionScoutingMission(
  input: ScoutingMissionTransitionInput,
  actorId: string,
) {
  const mission = await prisma.scoutingMission.findUnique({
    where: { id: input.id },
    select: { status: true, createdById: true, title: true },
  });

  if (!mission) {
    throw new ScoutingMissionServiceError("Scouting mission not found", "MISSION_NOT_FOUND");
  }

  if (mission.createdById !== actorId) {
    throw new ScoutingMissionServiceError(
      "Only the mission creator can change its status",
      "MISSION_NOT_OWNER",
    );
  }

  if (!isValidScoutingMissionTransition(mission.status, input.targetStatus)) {
    throw new ScoutingMissionServiceError(
      `Cannot transition from ${mission.status} to ${input.targetStatus}`,
      "INVALID_TRANSITION",
    );
  }

  const updated = await prisma.scoutingMission.update({
    where: { id: input.id },
    data: {
      status: input.targetStatus,
      previousStatus: mission.status,
    },
    include: missionDetailInclude,
  });

  childLogger.info(
    { missionId: updated.id, from: mission.status, to: input.targetStatus, actorId },
    "Scouting mission status changed",
  );

  eventBus.emit("scoutingMission.statusChanged", {
    entity: "scoutingMission",
    entityId: updated.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      title: mission.title,
      fromStatus: mission.status,
      toStatus: input.targetStatus,
    },
  });

  return mapMissionDetailResponse(updated);
}

// ── Scout Management ────────────────────────────────────────

export async function assignScouts(input: ScoutingMissionAssignScoutsInput, actorId: string) {
  const mission = await prisma.scoutingMission.findUnique({
    where: { id: input.missionId },
    select: { createdById: true, boardId: true, title: true },
  });

  if (!mission) {
    throw new ScoutingMissionServiceError("Scouting mission not found", "MISSION_NOT_FOUND");
  }

  if (mission.createdById !== actorId) {
    throw new ScoutingMissionServiceError(
      "Only the mission creator can manage scouts",
      "MISSION_NOT_OWNER",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.scoutingMissionScout.createMany({
      data: input.scoutIds.map((userId) => ({
        missionId: input.missionId,
        userId,
      })),
      skipDuplicates: true,
    });

    // Also share the linked board with new scouts
    if (mission.boardId) {
      await tx.scoutingBoardShare.createMany({
        data: input.scoutIds.map((userId) => ({
          boardId: mission.boardId!,
          userId,
          role: "EDITOR" as const,
        })),
        skipDuplicates: true,
      });
    }
  });

  childLogger.info(
    { missionId: input.missionId, scoutIds: input.scoutIds, actorId },
    "Scouts assigned to mission",
  );

  eventBus.emit("scoutingMission.scoutAssigned", {
    entity: "scoutingMission",
    entityId: input.missionId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { scoutIds: input.scoutIds, title: mission.title },
  });

  return { success: true };
}

export async function removeScout(input: ScoutingMissionRemoveScoutInput, actorId: string) {
  const mission = await prisma.scoutingMission.findUnique({
    where: { id: input.missionId },
    select: { createdById: true, boardId: true, title: true },
  });

  if (!mission) {
    throw new ScoutingMissionServiceError("Scouting mission not found", "MISSION_NOT_FOUND");
  }

  if (mission.createdById !== actorId) {
    throw new ScoutingMissionServiceError(
      "Only the mission creator can manage scouts",
      "MISSION_NOT_OWNER",
    );
  }

  await prisma.scoutingMissionScout.deleteMany({
    where: { missionId: input.missionId, userId: input.scoutId },
  });

  childLogger.info(
    { missionId: input.missionId, scoutId: input.scoutId, actorId },
    "Scout removed from mission",
  );

  eventBus.emit("scoutingMission.scoutRemoved", {
    entity: "scoutingMission",
    entityId: input.missionId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { scoutId: input.scoutId, title: mission.title },
  });

  return { success: true };
}
