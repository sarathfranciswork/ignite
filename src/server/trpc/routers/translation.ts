import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  translationTranslateInput,
  translationBatchTranslateInput,
  translationGetInput,
  translationGetAllInput,
  translationUpdateInput,
  translationDeleteInput,
  translationConfigureInput,
  translationGetConfigInput,
  translateContent,
  batchTranslate,
  getTranslation,
  getTranslations,
  updateTranslation,
  deleteTranslation,
  configureTranslation,
  getConfig,
  TranslationServiceError,
} from "@/server/services/translation.service";

function handleTranslationError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof TranslationServiceError) {
    const codeMap: Record<
      string,
      "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR" | "TOO_MANY_REQUESTS"
    > = {
      NOT_FOUND: "NOT_FOUND",
      RATE_LIMITED: "TOO_MANY_REQUESTS",
      INVALID_CONFIG: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}

export const translationRouter = createTRPCRouter({
  translate: protectedProcedure
    .use(requirePermission(Action.TRANSLATION_CREATE))
    .input(translationTranslateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await translateContent(input, ctx.session.user.id);
      } catch (error) {
        handleTranslationError(error);
      }
    }),

  batchTranslate: protectedProcedure
    .use(requirePermission(Action.TRANSLATION_CREATE))
    .input(translationBatchTranslateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await batchTranslate(input, ctx.session.user.id);
      } catch (error) {
        handleTranslationError(error);
      }
    }),

  get: protectedProcedure
    .use(requirePermission(Action.TRANSLATION_READ))
    .input(translationGetInput)
    .query(async ({ input }) => {
      try {
        return await getTranslation(input);
      } catch (error) {
        handleTranslationError(error);
      }
    }),

  getAll: protectedProcedure
    .use(requirePermission(Action.TRANSLATION_READ))
    .input(translationGetAllInput)
    .query(async ({ input }) => {
      try {
        return await getTranslations(input);
      } catch (error) {
        handleTranslationError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.TRANSLATION_UPDATE))
    .input(translationUpdateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await updateTranslation(input, ctx.session.user.id);
      } catch (error) {
        handleTranslationError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.TRANSLATION_DELETE))
    .input(translationDeleteInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await deleteTranslation(input, ctx.session.user.id);
      } catch (error) {
        handleTranslationError(error);
      }
    }),

  configure: protectedProcedure
    .use(requirePermission(Action.TRANSLATION_CONFIGURE))
    .input(translationConfigureInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await configureTranslation(input, ctx.session.user.id);
      } catch (error) {
        handleTranslationError(error);
      }
    }),

  getConfig: protectedProcedure
    .use(requirePermission(Action.TRANSLATION_READ))
    .input(translationGetConfigInput)
    .query(async ({ input }) => {
      try {
        return await getConfig(input);
      } catch (error) {
        handleTranslationError(error);
      }
    }),
});
