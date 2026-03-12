import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  apiKeyCreateInput,
  apiKeyListInput,
  apiKeyRevokeInput,
  apiKeyDeleteInput,
  apiKeyGetByIdInput,
  createApiKey,
  getApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  getAvailableScopes,
  ApiKeyServiceError,
} from "@/server/services/api-key.service";

function mapServiceError(error: unknown): never {
  if (error instanceof ApiKeyServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      API_KEY_NOT_FOUND: "NOT_FOUND",
      API_KEY_ALREADY_REVOKED: "BAD_REQUEST",
    };
    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

export const apiKeyRouter = createTRPCRouter({
  create: protectedProcedure
    .use(requirePermission(Action.API_KEY_CREATE))
    .input(apiKeyCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createApiKey(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.API_KEY_READ))
    .input(apiKeyGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getApiKey(input);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.API_KEY_READ))
    .input(apiKeyListInput)
    .query(async ({ input }) => {
      try {
        return await listApiKeys(input);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  revoke: protectedProcedure
    .use(requirePermission(Action.API_KEY_REVOKE))
    .input(apiKeyRevokeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokeApiKey(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.API_KEY_DELETE))
    .input(apiKeyDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteApiKey(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  availableScopes: protectedProcedure.use(requirePermission(Action.API_KEY_READ)).query(() => {
    return getAvailableScopes();
  }),
});
