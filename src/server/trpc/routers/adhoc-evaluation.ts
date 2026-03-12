import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  adhocEvaluationCreateInput,
  adhocEvaluationUpdateInput,
  adhocEvaluationListInput,
  adhocEvaluationGetByIdInput,
  adhocEvaluationDeleteInput,
  adhocEvaluationActivateInput,
  adhocEvaluationCompleteInput,
  adhocAddItemsInput,
  oneTeamCreateInput,
  oneTeamStartSessionInput,
  oneTeamEndSessionInput,
  consensusNoteCreateInput,
  consensusNoteListInput,
  AdhocEvaluationServiceError,
} from "@/server/services/adhoc-evaluation.schemas";
import {
  createAdhocEvaluation,
  listAdhocEvaluations,
  getAdhocEvaluationById,
  updateAdhocEvaluation,
  deleteAdhocEvaluation,
  activateAdhocEvaluation,
  completeAdhocEvaluation,
  addItemsToAdhocEvaluation,
  createOneTeamEvaluation,
  startOneTeamSession,
  endOneTeamSession,
  createConsensusNote,
  listConsensusNotes,
} from "@/server/services/adhoc-evaluation.service";

function handleError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof AdhocEvaluationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      SESSION_NOT_FOUND: "NOT_FOUND",
      INVALID_MODE: "BAD_REQUEST",
      SESSION_NOT_DRAFT: "BAD_REQUEST",
      SESSION_NOT_ACTIVE: "BAD_REQUEST",
      SESSION_ACTIVE: "BAD_REQUEST",
      SESSION_CLOSED: "BAD_REQUEST",
      NO_CRITERIA: "BAD_REQUEST",
      NO_EVALUATORS: "BAD_REQUEST",
      INVALID_SCALE_CONFIG: "BAD_REQUEST",
      INVALID_SCALE_RANGE: "BAD_REQUEST",
      SESSION_ALREADY_STARTED: "BAD_REQUEST",
      SESSION_NOT_STARTED: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const adhocEvaluationRouter = createTRPCRouter({
  // ── Ad-Hoc Evaluation ────────────────────────────────────

  create: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_CREATE))
    .input(adhocEvaluationCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createAdhocEvaluation(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_READ))
    .input(adhocEvaluationListInput)
    .query(async ({ ctx, input }) => {
      try {
        return await listAdhocEvaluations(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_READ))
    .input(adhocEvaluationGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getAdhocEvaluationById(input.id);
      } catch (error) {
        handleError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_UPDATE))
    .input(adhocEvaluationUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateAdhocEvaluation(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_DELETE))
    .input(adhocEvaluationDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteAdhocEvaluation(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  activate: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_UPDATE))
    .input(adhocEvaluationActivateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await activateAdhocEvaluation(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  complete: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_UPDATE))
    .input(adhocEvaluationCompleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeAdhocEvaluation(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  addItems: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_UPDATE))
    .input(adhocAddItemsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addItemsToAdhocEvaluation(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  // ── One-Team Evaluation ──────────────────────────────────

  createOneTeam: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_CREATE))
    .input(oneTeamCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createOneTeamEvaluation(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  startLiveSession: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_UPDATE))
    .input(oneTeamStartSessionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await startOneTeamSession(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  endLiveSession: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_UPDATE))
    .input(oneTeamEndSessionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await endOneTeamSession(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  addConsensusNote: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_UPDATE))
    .input(consensusNoteCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createConsensusNote(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  listConsensusNotes: protectedProcedure
    .use(requirePermission(Action.ADHOC_EVALUATION_READ))
    .input(consensusNoteListInput)
    .query(async ({ input }) => {
      try {
        return await listConsensusNotes(input);
      } catch (error) {
        handleError(error);
      }
    }),
});
