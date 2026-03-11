import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  ScoutingBoardListInput,
  ScoutingBoardCreateInput,
  ScoutingBoardUpdateInput,
  ScoutingBoardAddColumnInput,
  ScoutingBoardUpdateColumnInput,
  ScoutingBoardReorderColumnsInput,
  ScoutingBoardAddCardInput,
  ScoutingBoardUpdateCardInput,
  ScoutingBoardMoveCardInput,
  ScoutingBoardReorderCardsInput,
  ScoutingBoardArchiveCardInput,
  ScoutingBoardShareInput,
  ScoutingBoardUnshareInput,
} from "./scouting-board.schemas";

const childLogger = logger.child({ service: "scouting-board" });

// ── Error Class ──────────────────────────────────────────────

export class ScoutingBoardServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ScoutingBoardServiceError";
  }
}

// ── Prisma Includes ──────────────────────────────────────────

const columnInclude = {
  orderBy: { sortOrder: "asc" as const },
} satisfies Prisma.ScoutingBoardColumnFindManyArgs;

const cardInclude = {
  include: {
    organization: {
      select: {
        id: true,
        name: true,
        logoUrl: true,
        industry: true,
        location: true,
        fundingStage: true,
        relationshipStatus: true,
        websiteUrl: true,
      },
    },
  },
  orderBy: { sortOrder: "asc" as const },
} satisfies Prisma.ScoutingBoardCardFindManyArgs;

const shareInclude = {
  include: {
    user: { select: { id: true, name: true, email: true, image: true } },
  },
} satisfies Prisma.ScoutingBoardShareFindManyArgs;

const boardDetailInclude = {
  columns: {
    ...columnInclude,
    include: {
      cards: cardInclude,
    },
  },
  shares: shareInclude,
  createdBy: { select: { id: true, name: true, email: true, image: true } },
  _count: { select: { cards: true } },
} as const;

const boardListInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  shares: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
  _count: { select: { cards: true, columns: true } },
} as const;

type BoardWithDetail = Prisma.ScoutingBoardGetPayload<{
  include: typeof boardDetailInclude;
}>;

type BoardWithList = Prisma.ScoutingBoardGetPayload<{
  include: typeof boardListInclude;
}>;

// ── Response Mappers ─────────────────────────────────────────

function mapBoardListResponse(board: BoardWithList) {
  return {
    id: board.id,
    title: board.title,
    description: board.description,
    isArchived: board.isArchived,
    createdBy: board.createdBy,
    cardCount: board._count.cards,
    columnCount: board._count.columns,
    shares: board.shares.map((s) => ({
      id: s.id,
      role: s.role,
      user: s.user,
      sharedAt: s.sharedAt.toISOString(),
    })),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

function mapBoardDetailResponse(board: BoardWithDetail) {
  return {
    id: board.id,
    title: board.title,
    description: board.description,
    isArchived: board.isArchived,
    createdBy: board.createdBy,
    cardCount: board._count.cards,
    columns: board.columns.map((col) => ({
      id: col.id,
      name: col.name,
      type: col.type,
      color: col.color,
      sortOrder: col.sortOrder,
      cards: col.cards.map((card) => ({
        id: card.id,
        organizationId: card.organizationId,
        organization: card.organization,
        notes: card.notes,
        sortOrder: card.sortOrder,
        isArchived: card.isArchived,
        customValues: card.customValues as Record<string, unknown> | null,
        addedAt: card.addedAt.toISOString(),
      })),
    })),
    shares: board.shares.map((s) => ({
      id: s.id,
      role: s.role,
      user: s.user,
      sharedAt: s.sharedAt.toISOString(),
    })),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

// ── Access Check ─────────────────────────────────────────────

async function assertBoardAccess(
  boardId: string,
  userId: string,
  requireEdit: boolean,
): Promise<void> {
  const board = await prisma.scoutingBoard.findUnique({
    where: { id: boardId },
    select: {
      createdById: true,
      shares: { where: { userId }, select: { role: true } },
    },
  });

  if (!board) {
    throw new ScoutingBoardServiceError("Scouting board not found", "BOARD_NOT_FOUND");
  }

  if (board.createdById === userId) return;

  const share = board.shares[0];
  if (!share) {
    throw new ScoutingBoardServiceError(
      "You do not have access to this board",
      "BOARD_ACCESS_DENIED",
    );
  }

  if (requireEdit && share.role === "VIEWER") {
    throw new ScoutingBoardServiceError(
      "You do not have edit access to this board",
      "BOARD_EDIT_DENIED",
    );
  }
}

// ── Default Columns ──────────────────────────────────────────

const DEFAULT_COLUMNS = [
  { name: "Long List", color: "#6366f1" },
  { name: "Evaluating", color: "#f59e0b" },
  { name: "Short List", color: "#22c55e" },
  { name: "Archived", color: "#6b7280" },
];

// ── Board CRUD ───────────────────────────────────────────────

export async function listScoutingBoards(input: ScoutingBoardListInput, userId: string) {
  const limit = input.limit ?? 20;

  const where: Prisma.ScoutingBoardWhereInput = {
    isArchived: input.isArchived ?? false,
    ...(input.includeShared !== false
      ? {
          OR: [{ createdById: userId }, { shares: { some: { userId } } }],
        }
      : { createdById: userId }),
    ...(input.search
      ? {
          title: { contains: input.search, mode: "insensitive" as const },
        }
      : {}),
  };

  const orderBy: Prisma.ScoutingBoardOrderByWithRelationInput = {
    [input.sortBy ?? "updatedAt"]: input.sortDirection ?? "desc",
  };

  const items = await prisma.scoutingBoard.findMany({
    where,
    include: boardListInclude,
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
    items: items.map(mapBoardListResponse),
    nextCursor,
  };
}

export async function getScoutingBoardById(id: string, userId: string) {
  const board = await prisma.scoutingBoard.findUnique({
    where: { id },
    include: boardDetailInclude,
  });

  if (!board) {
    throw new ScoutingBoardServiceError("Scouting board not found", "BOARD_NOT_FOUND");
  }

  const isOwner = board.createdBy.id === userId;
  const isShared = board.shares.some((s) => s.user.id === userId);

  if (!isOwner && !isShared) {
    throw new ScoutingBoardServiceError(
      "You do not have access to this board",
      "BOARD_ACCESS_DENIED",
    );
  }

  return mapBoardDetailResponse(board);
}

export async function createScoutingBoard(input: ScoutingBoardCreateInput, actorId: string) {
  const columnsToCreate = input.columns ?? DEFAULT_COLUMNS;

  const board = await prisma.scoutingBoard.create({
    data: {
      title: input.title,
      description: input.description,
      createdById: actorId,
      columns: {
        create: columnsToCreate.map((col, index) => ({
          name: col.name,
          color: col.color,
          sortOrder: index,
        })),
      },
    },
    include: boardDetailInclude,
  });

  childLogger.info({ boardId: board.id, actorId }, "Scouting board created");

  eventBus.emit("scoutingBoard.created", {
    entity: "scoutingBoard",
    entityId: board.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: board.title },
  });

  return mapBoardDetailResponse(board);
}

export async function updateScoutingBoard(input: ScoutingBoardUpdateInput, actorId: string) {
  await assertBoardAccess(input.id, actorId, true);

  const board = await prisma.scoutingBoard.update({
    where: { id: input.id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    include: boardDetailInclude,
  });

  childLogger.info({ boardId: board.id, actorId }, "Scouting board updated");

  eventBus.emit("scoutingBoard.updated", {
    entity: "scoutingBoard",
    entityId: board.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: board.title },
  });

  return mapBoardDetailResponse(board);
}

export async function deleteScoutingBoard(id: string, actorId: string) {
  const board = await prisma.scoutingBoard.findUnique({
    where: { id },
    select: { createdById: true, title: true },
  });

  if (!board) {
    throw new ScoutingBoardServiceError("Scouting board not found", "BOARD_NOT_FOUND");
  }

  if (board.createdById !== actorId) {
    throw new ScoutingBoardServiceError("Only the board creator can delete it", "BOARD_NOT_OWNER");
  }

  await prisma.scoutingBoard.delete({ where: { id } });

  childLogger.info({ boardId: id, actorId }, "Scouting board deleted");

  eventBus.emit("scoutingBoard.deleted", {
    entity: "scoutingBoard",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: board.title },
  });

  return { success: true };
}

// ── Column Management ────────────────────────────────────────

export async function addColumn(input: ScoutingBoardAddColumnInput, actorId: string) {
  await assertBoardAccess(input.boardId, actorId, true);

  const maxOrder = await prisma.scoutingBoardColumn.aggregate({
    where: { boardId: input.boardId },
    _max: { sortOrder: true },
  });

  const column = await prisma.scoutingBoardColumn.create({
    data: {
      boardId: input.boardId,
      name: input.name,
      type: input.type,
      color: input.color,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  childLogger.info({ columnId: column.id, boardId: input.boardId, actorId }, "Column added");

  return column;
}

export async function updateColumn(input: ScoutingBoardUpdateColumnInput, actorId: string) {
  const column = await prisma.scoutingBoardColumn.findUnique({
    where: { id: input.id },
    select: { boardId: true },
  });

  if (!column) {
    throw new ScoutingBoardServiceError("Column not found", "COLUMN_NOT_FOUND");
  }

  await assertBoardAccess(column.boardId, actorId, true);

  const updated = await prisma.scoutingBoardColumn.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });

  childLogger.info({ columnId: updated.id, actorId }, "Column updated");

  return updated;
}

export async function deleteColumn(id: string, actorId: string) {
  const column = await prisma.scoutingBoardColumn.findUnique({
    where: { id },
    select: { boardId: true, _count: { select: { cards: true } } },
  });

  if (!column) {
    throw new ScoutingBoardServiceError("Column not found", "COLUMN_NOT_FOUND");
  }

  await assertBoardAccess(column.boardId, actorId, true);

  if (column._count.cards > 0) {
    throw new ScoutingBoardServiceError(
      "Cannot delete a column that contains cards. Move or remove cards first.",
      "COLUMN_NOT_EMPTY",
    );
  }

  await prisma.scoutingBoardColumn.delete({ where: { id } });

  childLogger.info({ columnId: id, actorId }, "Column deleted");

  return { success: true };
}

export async function reorderColumns(input: ScoutingBoardReorderColumnsInput, actorId: string) {
  await assertBoardAccess(input.boardId, actorId, true);

  await prisma.$transaction(
    input.columnIds.map((columnId, index) =>
      prisma.scoutingBoardColumn.update({
        where: { id: columnId },
        data: { sortOrder: index },
      }),
    ),
  );

  childLogger.info({ boardId: input.boardId, actorId }, "Columns reordered");

  return { success: true };
}

// ── Card Management ──────────────────────────────────────────

export async function addCard(input: ScoutingBoardAddCardInput, actorId: string) {
  await assertBoardAccess(input.boardId, actorId, true);

  const existingCard = await prisma.scoutingBoardCard.findUnique({
    where: {
      boardId_organizationId: {
        boardId: input.boardId,
        organizationId: input.organizationId,
      },
    },
  });

  if (existingCard) {
    throw new ScoutingBoardServiceError(
      "Organization is already on this board",
      "CARD_ALREADY_EXISTS",
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });

  if (!org) {
    throw new ScoutingBoardServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  const maxOrder = await prisma.scoutingBoardCard.aggregate({
    where: { boardId: input.boardId, columnId: input.columnId },
    _max: { sortOrder: true },
  });

  const card = await prisma.scoutingBoardCard.create({
    data: {
      boardId: input.boardId,
      columnId: input.columnId,
      organizationId: input.organizationId,
      notes: input.notes,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          industry: true,
          location: true,
          fundingStage: true,
          relationshipStatus: true,
          websiteUrl: true,
        },
      },
    },
  });

  childLogger.info(
    { cardId: card.id, boardId: input.boardId, orgId: input.organizationId, actorId },
    "Card added to board",
  );

  eventBus.emit("scoutingBoard.cardAdded", {
    entity: "scoutingBoardCard",
    entityId: card.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      boardId: input.boardId,
      organizationId: input.organizationId,
      organizationName: card.organization.name,
    },
  });

  return {
    id: card.id,
    organizationId: card.organizationId,
    organization: card.organization,
    notes: card.notes,
    sortOrder: card.sortOrder,
    isArchived: card.isArchived,
    customValues: card.customValues as Record<string, unknown> | null,
    addedAt: card.addedAt.toISOString(),
  };
}

export async function updateCard(input: ScoutingBoardUpdateCardInput, actorId: string) {
  const card = await prisma.scoutingBoardCard.findUnique({
    where: { id: input.id },
    select: { boardId: true },
  });

  if (!card) {
    throw new ScoutingBoardServiceError("Card not found", "CARD_NOT_FOUND");
  }

  await assertBoardAccess(card.boardId, actorId, true);

  const data: Prisma.ScoutingBoardCardUpdateInput = {};
  if (input.notes !== undefined) {
    data.notes = input.notes;
  }
  if (input.customValues !== undefined) {
    data.customValues =
      input.customValues === null ? Prisma.JsonNull : (input.customValues as Prisma.InputJsonValue);
  }

  const updated = await prisma.scoutingBoardCard.update({
    where: { id: input.id },
    data,
  });

  childLogger.info({ cardId: updated.id, actorId }, "Card updated");

  return updated;
}

export async function moveCard(input: ScoutingBoardMoveCardInput, actorId: string) {
  const card = await prisma.scoutingBoardCard.findUnique({
    where: { id: input.id },
    select: { boardId: true, columnId: true },
  });

  if (!card) {
    throw new ScoutingBoardServiceError("Card not found", "CARD_NOT_FOUND");
  }

  await assertBoardAccess(card.boardId, actorId, true);

  const updated = await prisma.scoutingBoardCard.update({
    where: { id: input.id },
    data: {
      columnId: input.columnId,
      sortOrder: input.sortOrder,
    },
  });

  childLogger.info(
    { cardId: updated.id, fromColumn: card.columnId, toColumn: input.columnId, actorId },
    "Card moved",
  );

  eventBus.emit("scoutingBoard.cardMoved", {
    entity: "scoutingBoardCard",
    entityId: updated.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      boardId: card.boardId,
      fromColumnId: card.columnId,
      toColumnId: input.columnId,
    },
  });

  return updated;
}

export async function removeCard(id: string, actorId: string) {
  const card = await prisma.scoutingBoardCard.findUnique({
    where: { id },
    select: { boardId: true, organizationId: true },
  });

  if (!card) {
    throw new ScoutingBoardServiceError("Card not found", "CARD_NOT_FOUND");
  }

  await assertBoardAccess(card.boardId, actorId, true);

  await prisma.scoutingBoardCard.delete({ where: { id } });

  childLogger.info({ cardId: id, actorId }, "Card removed from board");

  eventBus.emit("scoutingBoard.cardRemoved", {
    entity: "scoutingBoardCard",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { boardId: card.boardId, organizationId: card.organizationId },
  });

  return { success: true };
}

export async function archiveCard(input: ScoutingBoardArchiveCardInput, actorId: string) {
  const card = await prisma.scoutingBoardCard.findUnique({
    where: { id: input.id },
    select: { boardId: true },
  });

  if (!card) {
    throw new ScoutingBoardServiceError("Card not found", "CARD_NOT_FOUND");
  }

  await assertBoardAccess(card.boardId, actorId, true);

  const updated = await prisma.scoutingBoardCard.update({
    where: { id: input.id },
    data: { isArchived: input.isArchived },
  });

  childLogger.info(
    { cardId: updated.id, isArchived: input.isArchived, actorId },
    input.isArchived ? "Card archived" : "Card reactivated",
  );

  return updated;
}

export async function reorderCards(input: ScoutingBoardReorderCardsInput, actorId: string) {
  await assertBoardAccess(input.boardId, actorId, true);

  await prisma.$transaction(
    input.cardIds.map((cardId, index) =>
      prisma.scoutingBoardCard.update({
        where: { id: cardId },
        data: { sortOrder: index },
      }),
    ),
  );

  childLogger.info(
    { boardId: input.boardId, columnId: input.columnId, actorId },
    "Cards reordered",
  );

  return { success: true };
}

// ── Sharing ──────────────────────────────────────────────────

export async function shareBoard(input: ScoutingBoardShareInput, actorId: string) {
  const board = await prisma.scoutingBoard.findUnique({
    where: { id: input.boardId },
    select: { createdById: true, title: true },
  });

  if (!board) {
    throw new ScoutingBoardServiceError("Scouting board not found", "BOARD_NOT_FOUND");
  }

  if (board.createdById !== actorId) {
    throw new ScoutingBoardServiceError("Only the board creator can share it", "BOARD_NOT_OWNER");
  }

  const filteredUserIds = input.userIds.filter((uid) => uid !== actorId);

  if (filteredUserIds.length === 0) {
    throw new ScoutingBoardServiceError("Cannot share a board with yourself", "INVALID_SHARE");
  }

  await prisma.$transaction(
    filteredUserIds.map((userId) =>
      prisma.scoutingBoardShare.upsert({
        where: { boardId_userId: { boardId: input.boardId, userId } },
        create: { boardId: input.boardId, userId, role: input.role },
        update: { role: input.role },
      }),
    ),
  );

  childLogger.info(
    { boardId: input.boardId, sharedWith: filteredUserIds, role: input.role, actorId },
    "Board shared",
  );

  eventBus.emit("scoutingBoard.shared", {
    entity: "scoutingBoard",
    entityId: input.boardId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userIds: filteredUserIds, role: input.role, title: board.title },
  });

  return { success: true };
}

export async function unshareBoard(input: ScoutingBoardUnshareInput, actorId: string) {
  const board = await prisma.scoutingBoard.findUnique({
    where: { id: input.boardId },
    select: { createdById: true },
  });

  if (!board) {
    throw new ScoutingBoardServiceError("Scouting board not found", "BOARD_NOT_FOUND");
  }

  if (board.createdById !== actorId) {
    throw new ScoutingBoardServiceError(
      "Only the board creator can manage sharing",
      "BOARD_NOT_OWNER",
    );
  }

  await prisma.scoutingBoardShare.deleteMany({
    where: { boardId: input.boardId, userId: input.userId },
  });

  childLogger.info(
    { boardId: input.boardId, removedUserId: input.userId, actorId },
    "Board unshared",
  );

  return { success: true };
}
