import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  scoutingBoardListInput,
  scoutingBoardCreateInput,
  scoutingBoardUpdateInput,
  scoutingBoardGetByIdInput,
  scoutingBoardDeleteInput,
  scoutingBoardAddColumnInput,
  scoutingBoardUpdateColumnInput,
  scoutingBoardDeleteColumnInput,
  scoutingBoardReorderColumnsInput,
  scoutingBoardAddCardInput,
  scoutingBoardUpdateCardInput,
  scoutingBoardMoveCardInput,
  scoutingBoardRemoveCardInput,
  scoutingBoardArchiveCardInput,
  scoutingBoardReorderCardsInput,
  scoutingBoardShareInput,
  scoutingBoardUnshareInput,
} from "@/server/services/scouting-board.schemas";
import {
  listScoutingBoards,
  getScoutingBoardById,
  createScoutingBoard,
  updateScoutingBoard,
  deleteScoutingBoard,
  addColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  addCard,
  updateCard,
  moveCard,
  removeCard,
  archiveCard,
  reorderCards,
  shareBoard,
  unshareBoard,
  ScoutingBoardServiceError,
} from "@/server/services/scouting-board.service";

function handleScoutingBoardError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ScoutingBoardServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT"> = {
      BOARD_NOT_FOUND: "NOT_FOUND",
      COLUMN_NOT_FOUND: "NOT_FOUND",
      CARD_NOT_FOUND: "NOT_FOUND",
      ORGANIZATION_NOT_FOUND: "NOT_FOUND",
      BOARD_ACCESS_DENIED: "FORBIDDEN",
      BOARD_EDIT_DENIED: "FORBIDDEN",
      BOARD_NOT_OWNER: "FORBIDDEN",
      CARD_ALREADY_EXISTS: "CONFLICT",
      COLUMN_NOT_EMPTY: "BAD_REQUEST",
      INVALID_SHARE: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const scoutingBoardRouter = createTRPCRouter({
  // ── Board CRUD ──────────────────────────────────────────────

  list: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_READ))
    .input(scoutingBoardListInput)
    .query(async ({ ctx, input }) => {
      return listScoutingBoards(input, ctx.session.user.id);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_READ))
    .input(scoutingBoardGetByIdInput)
    .query(async ({ ctx, input }) => {
      try {
        return await getScoutingBoardById(input.id, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_CREATE))
    .input(scoutingBoardCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createScoutingBoard(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateScoutingBoard(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_DELETE))
    .input(scoutingBoardDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteScoutingBoard(input.id, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  // ── Column Management ───────────────────────────────────────

  addColumn: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardAddColumnInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addColumn(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  updateColumn: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardUpdateColumnInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateColumn(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  deleteColumn: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardDeleteColumnInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteColumn(input.id, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  reorderColumns: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardReorderColumnsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await reorderColumns(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  // ── Card Management ─────────────────────────────────────────

  addCard: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardAddCardInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addCard(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  updateCard: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardUpdateCardInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCard(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  moveCard: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardMoveCardInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await moveCard(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  removeCard: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardRemoveCardInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeCard(input.id, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  archiveCard: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardArchiveCardInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveCard(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  reorderCards: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_UPDATE))
    .input(scoutingBoardReorderCardsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await reorderCards(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  // ── Sharing ─────────────────────────────────────────────────

  share: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_SHARE))
    .input(scoutingBoardShareInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await shareBoard(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),

  unshare: protectedProcedure
    .use(requirePermission(Action.SCOUTING_BOARD_SHARE))
    .input(scoutingBoardUnshareInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unshareBoard(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingBoardError(error);
      }
    }),
});
