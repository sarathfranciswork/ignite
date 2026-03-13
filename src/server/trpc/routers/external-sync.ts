import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  externalSyncConfigureInput,
  externalSyncUpdateInput,
  externalSyncByIdInput,
  externalSyncListInput,
  syncIdeaInput,
  syncProjectInput,
  syncedItemListInput,
  testConnectionInput,
} from "@/server/services/external-sync.schemas";
import {
  configureSync,
  updateSync,
  deleteSync,
  getSyncById,
  listSyncConfigs,
  listSyncedItems,
  syncIdea,
  syncProject,
  testConnection,
  resyncItem,
  ExternalSyncServiceError,
} from "@/server/services/external-sync.service";

function handleExternalSyncError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ExternalSyncServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR"> = {
      NOT_FOUND: "NOT_FOUND",
      INACTIVE: "BAD_REQUEST",
      SYNC_FAILED: "BAD_REQUEST",
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

export const externalSyncRouter = createTRPCRouter({
  configure: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_CREATE))
    .input(externalSyncConfigureInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await configureSync(input, ctx.session.user.id);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_UPDATE))
    .input(externalSyncUpdateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await updateSync(input, ctx.session.user.id);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  syncIdea: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_EXECUTE))
    .input(syncIdeaInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await syncIdea(input, ctx.session.user.id);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  syncProject: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_EXECUTE))
    .input(syncProjectInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await syncProject(input, ctx.session.user.id);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_READ))
    .input(externalSyncListInput)
    .query(async ({ input }) => {
      try {
        return await listSyncConfigs(input);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_READ))
    .input(externalSyncByIdInput)
    .query(async ({ input }) => {
      try {
        return await getSyncById(input.id);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  listItems: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_READ))
    .input(syncedItemListInput)
    .query(async ({ input }) => {
      try {
        return await listSyncedItems(input);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_DELETE))
    .input(externalSyncByIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await deleteSync(input.id, ctx.session.user.id);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  testConnection: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_READ))
    .input(testConnectionInput)
    .mutation(async ({ input }) => {
      try {
        return await testConnection(input);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),

  resyncItem: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_SYNC_EXECUTE))
    .input(externalSyncByIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await resyncItem(input.id, ctx.session.user.id);
      } catch (error) {
        handleExternalSyncError(error);
      }
    }),
});
