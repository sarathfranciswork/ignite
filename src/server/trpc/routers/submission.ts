import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  submissionDefinitionCreateInput,
  submissionDefinitionUpdateInput,
  submissionDefinitionListInput,
  submissionDefinitionGetByIdInput,
  submissionDefinitionGetBySlugInput,
  submissionDefinitionDeleteInput,
  submissionDefinitionActivateInput,
  submissionDefinitionArchiveInput,
  genericSubmissionCreateInput,
  genericSubmissionUpdateInput,
  genericSubmissionSubmitInput,
  genericSubmissionReviewInput,
  genericSubmissionListInput,
  genericSubmissionGetByIdInput,
  genericSubmissionDeleteInput,
  SubmissionServiceError,
} from "@/server/services/submission-definition.schemas";
import {
  createSubmissionDefinition,
  listSubmissionDefinitions,
  getSubmissionDefinitionById,
  getSubmissionDefinitionBySlug,
  updateSubmissionDefinition,
  deleteSubmissionDefinition,
  activateSubmissionDefinition,
  archiveSubmissionDefinition,
  createGenericSubmission,
  listGenericSubmissions,
  getGenericSubmissionById,
  updateGenericSubmission,
  submitGenericSubmission,
  reviewGenericSubmission,
  deleteGenericSubmission,
} from "@/server/services/submission-definition.service";

function handleError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof SubmissionServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT"> = {
      DEFINITION_NOT_FOUND: "NOT_FOUND",
      SUBMISSION_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      SLUG_CONFLICT: "CONFLICT",
      DEFINITION_NOT_DRAFT: "BAD_REQUEST",
      DEFINITION_NOT_ACTIVE: "BAD_REQUEST",
      ALREADY_ARCHIVED: "BAD_REQUEST",
      HAS_SUBMISSIONS: "BAD_REQUEST",
      NO_FIELDS: "BAD_REQUEST",
      SUBMISSION_NOT_DRAFT: "BAD_REQUEST",
      INVALID_STATUS: "BAD_REQUEST",
      MISSING_REQUIRED_FIELDS: "BAD_REQUEST",
      NOT_OWNER: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const submissionRouter = createTRPCRouter({
  // ── Submission Definitions ───────────────────────────────

  definitionCreate: protectedProcedure
    .use(requirePermission(Action.SUBMISSION_DEFINITION_CREATE))
    .input(submissionDefinitionCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createSubmissionDefinition(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  definitionList: protectedProcedure
    .use(requirePermission(Action.SUBMISSION_DEFINITION_READ))
    .input(submissionDefinitionListInput)
    .query(async ({ input }) => {
      try {
        return await listSubmissionDefinitions(input);
      } catch (error) {
        handleError(error);
      }
    }),

  definitionGetById: protectedProcedure
    .use(requirePermission(Action.SUBMISSION_DEFINITION_READ))
    .input(submissionDefinitionGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getSubmissionDefinitionById(input.id);
      } catch (error) {
        handleError(error);
      }
    }),

  definitionGetBySlug: protectedProcedure
    .use(requirePermission(Action.SUBMISSION_DEFINITION_READ))
    .input(submissionDefinitionGetBySlugInput)
    .query(async ({ input }) => {
      try {
        return await getSubmissionDefinitionBySlug(input.slug);
      } catch (error) {
        handleError(error);
      }
    }),

  definitionUpdate: protectedProcedure
    .use(requirePermission(Action.SUBMISSION_DEFINITION_UPDATE))
    .input(submissionDefinitionUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateSubmissionDefinition(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  definitionDelete: protectedProcedure
    .use(requirePermission(Action.SUBMISSION_DEFINITION_DELETE))
    .input(submissionDefinitionDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteSubmissionDefinition(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  definitionActivate: protectedProcedure
    .use(requirePermission(Action.SUBMISSION_DEFINITION_UPDATE))
    .input(submissionDefinitionActivateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await activateSubmissionDefinition(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  definitionArchive: protectedProcedure
    .use(requirePermission(Action.SUBMISSION_DEFINITION_UPDATE))
    .input(submissionDefinitionArchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveSubmissionDefinition(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  // ── Generic Submissions ──────────────────────────────────

  create: protectedProcedure
    .use(requirePermission(Action.GENERIC_SUBMISSION_CREATE))
    .input(genericSubmissionCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createGenericSubmission(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.GENERIC_SUBMISSION_READ))
    .input(genericSubmissionListInput)
    .query(async ({ input }) => {
      try {
        return await listGenericSubmissions(input);
      } catch (error) {
        handleError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.GENERIC_SUBMISSION_READ))
    .input(genericSubmissionGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getGenericSubmissionById(input.id);
      } catch (error) {
        handleError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.GENERIC_SUBMISSION_UPDATE_OWN))
    .input(genericSubmissionUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateGenericSubmission(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  submit: protectedProcedure
    .use(requirePermission(Action.GENERIC_SUBMISSION_CREATE))
    .input(genericSubmissionSubmitInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitGenericSubmission(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  review: protectedProcedure
    .use(requirePermission(Action.GENERIC_SUBMISSION_REVIEW))
    .input(genericSubmissionReviewInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewGenericSubmission(input, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.GENERIC_SUBMISSION_UPDATE_OWN))
    .input(genericSubmissionDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteGenericSubmission(input.id, ctx.session.user.id);
      } catch (error) {
        handleError(error);
      }
    }),
});
