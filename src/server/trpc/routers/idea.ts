import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import { checkPermission } from "@/server/services/rbac.service";
import {
  ideaCreateInput,
  ideaUpdateInput,
  ideaListInput,
  ideaGetByIdInput,
  ideaSubmitInput,
  ideaDeleteInput,
  ideaTransitionInput,
  ideaGetTransitionsInput,
  ideaArchiveInput,
  ideaUnarchiveInput,
  ideaCoachQualifyInput,
  ideaBoardListInput,
  ideaSetConfidentialInput,
  listIdeasWithConfidentialFilter,
  listIdeasForBoard,
  getIdeaByIdWithConfidentialCheck,
  createIdea,
  updateIdea,
  submitIdea,
  deleteIdea,
  transitionIdea,
  getIdeaValidTransitions,
  archiveIdea,
  unarchiveIdea,
  coachQualifyIdea,
  setIdeaConfidential,
  IdeaServiceError,
} from "@/server/services/idea.service";
import {
  ideaSplitInput,
  ideaMergeInput,
  ideaBulkAssignBucketInput,
  ideaBulkArchiveInput,
  ideaBulkExportInput,
  ideaMergeHistoryInput,
} from "@/server/services/idea.schemas";
import {
  splitIdea,
  mergeIdeas,
  getMergeHistory,
  bulkAssignBucket,
  bulkArchiveIdeas,
  bulkExportIdeas,
} from "@/server/services/idea-split-merge.service";

function handleIdeaError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof IdeaServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      IDEA_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      BUCKET_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_ACCEPTING: "BAD_REQUEST",
      CONFIDENTIAL_NOT_ALLOWED: "BAD_REQUEST",
      INVALID_STATUS: "BAD_REQUEST",
      INVALID_TRANSITION: "BAD_REQUEST",
      INVALID_MERGE_TARGET: "BAD_REQUEST",
      CAMPAIGN_MISMATCH: "BAD_REQUEST",
      NO_VALID_TRANSITION: "BAD_REQUEST",
      NO_PREVIOUS_STATUS: "BAD_REQUEST",
      COACH_NOT_ENABLED: "BAD_REQUEST",
      NOT_AUTHORIZED: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const ideaRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission<{ campaignId: string }>(Action.IDEA_READ, (input) => input.campaignId))
    .input(ideaListInput)
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const canReadConfidential = await checkPermission(
          userId,
          Action.IDEA_READ_CONFIDENTIAL,
          input.campaignId,
        );
        return await listIdeasWithConfidentialFilter(input, userId, canReadConfidential);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  listForBoard: protectedProcedure
    .use(requirePermission<{ campaignId: string }>(Action.IDEA_READ, (input) => input.campaignId))
    .input(ideaBoardListInput)
    .query(async ({ input }) => {
      return listIdeasForBoard(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(ideaGetByIdInput)
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const canReadConfidential = await checkPermission(userId, Action.IDEA_READ_CONFIDENTIAL);
        return await getIdeaByIdWithConfidentialCheck(input.id, userId, canReadConfidential);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission<{ campaignId: string }>(Action.IDEA_CREATE, (input) => input.campaignId))
    .input(ideaCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.IDEA_UPDATE_OWN))
    .input(ideaUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  submit: protectedProcedure
    .use(requirePermission(Action.IDEA_CREATE))
    .input(ideaSubmitInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitIdea(input.id, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.IDEA_DELETE_OWN))
    .input(ideaDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteIdea(input.id, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  setConfidential: protectedProcedure
    .use(requirePermission(Action.IDEA_SET_CONFIDENTIAL))
    .input(ideaSetConfidentialInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await setIdeaConfidential(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  getValidTransitions: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(ideaGetTransitionsInput)
    .query(async ({ input }) => {
      try {
        return await getIdeaValidTransitions(input.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  transition: protectedProcedure
    .use(requirePermission(Action.IDEA_TRANSITION))
    .input(ideaTransitionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await transitionIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  archive: protectedProcedure
    .use(requirePermission(Action.IDEA_MODERATE))
    .input(ideaArchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  unarchive: protectedProcedure
    .use(requirePermission(Action.IDEA_MODERATE))
    .input(ideaUnarchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unarchiveIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  coachQualify: protectedProcedure
    .use(requirePermission(Action.IDEA_TRANSITION))
    .input(ideaCoachQualifyInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await coachQualifyIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  split: protectedProcedure
    .use(requirePermission(Action.IDEA_SPLIT))
    .input(ideaSplitInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await splitIdea(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  merge: protectedProcedure
    .use(requirePermission(Action.IDEA_MERGE))
    .input(ideaMergeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await mergeIdeas(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  mergeHistory: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(ideaMergeHistoryInput)
    .query(async ({ input }) => {
      try {
        return await getMergeHistory(input.ideaId);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  bulkAssignBucket: protectedProcedure
    .use(requirePermission(Action.IDEA_BULK_ACTION))
    .input(ideaBulkAssignBucketInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await bulkAssignBucket(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  bulkArchive: protectedProcedure
    .use(requirePermission(Action.IDEA_BULK_ACTION))
    .input(ideaBulkArchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await bulkArchiveIdeas(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),

  bulkExport: protectedProcedure
    .use(requirePermission(Action.IDEA_BULK_ACTION))
    .input(ideaBulkExportInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await bulkExportIdeas(input, ctx.session.user.id);
      } catch (error) {
        handleIdeaError(error);
      }
    }),
});
