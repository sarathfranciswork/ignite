import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  evaluationSessionCreateInput,
  evaluationSessionUpdateInput,
  evaluationSessionListInput,
  evaluationSessionGetByIdInput,
  evaluationSessionDeleteInput,
  evaluationSessionActivateInput,
  evaluationSessionCompleteInput,
  evaluationAssignEvaluatorsInput,
  evaluationRemoveEvaluatorInput,
  evaluationAddIdeasInput,
  evaluationRemoveIdeaInput,
  evaluationAddIdeasFromBucketInput,
  evaluationSubmitResponseInput,
  evaluationProgressInput,
  evaluationResultsInput,
  evaluationSaveAsTemplateInput,
  evaluationListTemplatesInput,
  evaluationMyPendingInput,
  evaluationMyResponsesInput,
  evaluationSendRemindersInput,
  pairwiseSubmitComparisonInput,
  pairwiseGetNextPairInput,
  pairwiseGetPairsInput,
  pairwiseGetMyComparisonInput,
  pairwiseProgressInput,
  pairwiseResultsInput,
  shortlistAddItemInput,
  shortlistRemoveItemInput,
  shortlistLockInput,
  shortlistGetInput,
  shortlistForwardInput,
  shortlistForwardAllInput,
  shortlistAddIdeasInput,
  shortlistRemoveIdeaInput,
  shortlistUpdateEntryInput,
} from "@/server/services/evaluation.schemas";
import {
  listEvaluationSessions,
  getEvaluationSessionById,
  createEvaluationSession,
  updateEvaluationSession,
  deleteEvaluationSession,
  activateEvaluationSession,
  completeEvaluationSession,
  assignEvaluators,
  removeEvaluator,
  addIdeasToSession,
  removeIdeaFromSession,
  addIdeasFromBucket,
  submitResponse,
  getEvaluationProgress,
  getEvaluationResults,
  saveSessionAsTemplate,
  listTemplates,
  getMyPendingEvaluations,
  getMyResponses,
  sendReminders,
  EvaluationServiceError,
} from "@/server/services/evaluation.service";
import {
  getPairwisePairs,
  getNextPair,
  submitPairwiseComparison,
} from "@/server/services/pairwise.service";
import {
  getMyComparison,
  getPairwiseProgress,
  getPairwiseResults,
} from "@/server/services/pairwise-ranking.service";
import {
  getEnhancedResults,
  addToShortlist,
  removeFromShortlist,
  forwardAllShortlistItems,
} from "@/server/services/results.service";
import {
  getShortlist,
  addIdeasToShortlist,
  removeIdeaFromShortlist,
  lockShortlist,
  forwardShortlistedIdea,
  updateShortlistEntry,
} from "@/server/services/shortlist.service";

function handleEvaluationError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof EvaluationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      SESSION_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      EVALUATOR_NOT_FOUND: "NOT_FOUND",
      IDEA_NOT_IN_SESSION: "NOT_FOUND",
      IDEAS_NOT_FOUND: "NOT_FOUND",
      BUCKET_NOT_FOUND: "NOT_FOUND",
      SESSION_NOT_DRAFT: "BAD_REQUEST",
      SESSION_NOT_ACTIVE: "BAD_REQUEST",
      SESSION_ACTIVE: "BAD_REQUEST",
      SESSION_CLOSED: "BAD_REQUEST",
      NO_CRITERIA: "BAD_REQUEST",
      NO_EVALUATORS: "BAD_REQUEST",
      NO_IDEAS: "BAD_REQUEST",
      INVALID_SCALE_CONFIG: "BAD_REQUEST",
      INVALID_SCALE_RANGE: "BAD_REQUEST",
      SESSION_NOT_PAIRWISE: "BAD_REQUEST",
      SHORTLIST_LOCKED: "BAD_REQUEST",
      SHORTLIST_ALREADY_LOCKED: "BAD_REQUEST",
      SHORTLIST_NOT_LOCKED: "BAD_REQUEST",
      NOT_IN_SHORTLIST: "NOT_FOUND",
      NOT_EVALUATOR: "FORBIDDEN",
      SHORTLIST_NOT_FOUND: "NOT_FOUND",
      IDEA_NOT_IN_SHORTLIST: "NOT_FOUND",
      SHORTLIST_EMPTY: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const evaluationRouter = createTRPCRouter({
  list: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.EVALUATION_VIEW_RESULTS,
        (input) => input.campaignId,
      ),
    )
    .input(evaluationSessionListInput)
    .query(async ({ input }) => {
      try {
        return await listEvaluationSessions(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(evaluationSessionGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getEvaluationSessionById(input.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  create: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.EVALUATION_CREATE,
        (input) => input.campaignId,
      ),
    )
    .input(evaluationSessionCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createEvaluationSession(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.EVALUATION_UPDATE))
    .input(evaluationSessionUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateEvaluationSession(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.EVALUATION_DELETE))
    .input(evaluationSessionDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteEvaluationSession(input.id, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  activate: protectedProcedure
    .use(requirePermission(Action.EVALUATION_UPDATE))
    .input(evaluationSessionActivateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await activateEvaluationSession(input.id, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  complete: protectedProcedure
    .use(requirePermission(Action.EVALUATION_UPDATE))
    .input(evaluationSessionCompleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeEvaluationSession(input.id, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  assignEvaluators: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_EVALUATORS))
    .input(evaluationAssignEvaluatorsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await assignEvaluators(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  removeEvaluator: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_EVALUATORS))
    .input(evaluationRemoveEvaluatorInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeEvaluator(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  addIdeas: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_IDEAS))
    .input(evaluationAddIdeasInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addIdeasToSession(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  removeIdea: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_IDEAS))
    .input(evaluationRemoveIdeaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeIdeaFromSession(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  addIdeasFromBucket: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_IDEAS))
    .input(evaluationAddIdeasFromBucketInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addIdeasFromBucket(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  submitResponse: protectedProcedure
    .use(requirePermission(Action.EVALUATION_PARTICIPATE))
    .input(evaluationSubmitResponseInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitResponse(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  progress: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(evaluationProgressInput)
    .query(async ({ input }) => {
      try {
        return await getEvaluationProgress(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  results: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(evaluationResultsInput)
    .query(async ({ input }) => {
      try {
        return await getEvaluationResults(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  saveAsTemplate: protectedProcedure
    .use(requirePermission(Action.EVALUATION_CREATE))
    .input(evaluationSaveAsTemplateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveSessionAsTemplate(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  listTemplates: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(evaluationListTemplatesInput)
    .query(async ({ input }) => {
      try {
        return await listTemplates(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  myPending: protectedProcedure
    .use(requirePermission(Action.EVALUATION_PARTICIPATE))
    .input(evaluationMyPendingInput)
    .query(async ({ ctx, input }) => {
      try {
        return await getMyPendingEvaluations(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  myResponses: protectedProcedure
    .use(requirePermission(Action.EVALUATION_PARTICIPATE))
    .input(evaluationMyResponsesInput)
    .query(async ({ ctx, input }) => {
      try {
        return await getMyResponses(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  sendReminders: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_EVALUATORS))
    .input(evaluationSendRemindersInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendReminders(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  // ── Pairwise Evaluation Endpoints ────────────────────────

  pairwisePairs: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(pairwiseGetPairsInput)
    .query(async ({ input }) => {
      try {
        return await getPairwisePairs(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  pairwiseNextPair: protectedProcedure
    .use(requirePermission(Action.EVALUATION_PARTICIPATE))
    .input(pairwiseGetNextPairInput)
    .query(async ({ ctx, input }) => {
      try {
        return await getNextPair(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  pairwiseSubmit: protectedProcedure
    .use(requirePermission(Action.EVALUATION_PARTICIPATE))
    .input(pairwiseSubmitComparisonInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitPairwiseComparison(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  pairwiseMyComparison: protectedProcedure
    .use(requirePermission(Action.EVALUATION_PARTICIPATE))
    .input(pairwiseGetMyComparisonInput)
    .query(async ({ ctx, input }) => {
      try {
        return await getMyComparison(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  pairwiseProgress: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(pairwiseProgressInput)
    .query(async ({ input }) => {
      try {
        return await getPairwiseProgress(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  pairwiseResults: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(pairwiseResultsInput)
    .query(async ({ input }) => {
      try {
        return await getPairwiseResults(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  // ── Enhanced Results & Shortlist ─────────────────────────

  enhancedResults: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(evaluationResultsInput)
    .query(async ({ input }) => {
      try {
        return await getEnhancedResults(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  // ── Shortlist Endpoints ────────────────────────────────

  shortlistGet: protectedProcedure
    .use(requirePermission(Action.EVALUATION_VIEW_RESULTS))
    .input(shortlistGetInput)
    .query(async ({ input }) => {
      try {
        return await getShortlist(input);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  shortlistAdd: protectedProcedure
    .use(requirePermission(Action.EVALUATION_UPDATE))
    .input(shortlistAddItemInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addToShortlist(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  shortlistAddIdeas: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_IDEAS))
    .input(shortlistAddIdeasInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addIdeasToShortlist(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  shortlistRemove: protectedProcedure
    .use(requirePermission(Action.EVALUATION_UPDATE))
    .input(shortlistRemoveItemInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeFromShortlist(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  shortlistRemoveIdea: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_IDEAS))
    .input(shortlistRemoveIdeaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeIdeaFromShortlist(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  shortlistLock: protectedProcedure
    .use(requirePermission(Action.EVALUATION_UPDATE))
    .input(shortlistLockInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await lockShortlist(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  shortlistForward: protectedProcedure
    .use(requirePermission(Action.EVALUATION_UPDATE))
    .input(shortlistForwardInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await forwardShortlistedIdea(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  shortlistForwardAll: protectedProcedure
    .use(requirePermission(Action.EVALUATION_UPDATE))
    .input(shortlistForwardAllInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await forwardAllShortlistItems(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),

  shortlistUpdateEntry: protectedProcedure
    .use(requirePermission(Action.EVALUATION_MANAGE_IDEAS))
    .input(shortlistUpdateEntryInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateShortlistEntry(input, ctx.session.user.id);
      } catch (error) {
        handleEvaluationError(error);
      }
    }),
});
