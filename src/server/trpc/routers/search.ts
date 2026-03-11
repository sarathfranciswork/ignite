import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  globalSearchInput,
  exploreListInput,
  savedSearchCreateInput,
  savedSearchDeleteInput,
} from "@/server/services/search.schemas";
import {
  globalSearch,
  exploreList,
  listSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  SearchServiceError,
} from "@/server/services/search.service";

function handleSearchError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  if (error instanceof SearchServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "FORBIDDEN"> = {
      SAVED_SEARCH_NOT_FOUND: "NOT_FOUND",
      NOT_OWNER: "FORBIDDEN",
    };
    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }
  throw error;
}

export const searchRouter = createTRPCRouter({
  global: protectedProcedure
    .use(requirePermission(Action.SEARCH_GLOBAL))
    .input(globalSearchInput)
    .query(async ({ input }) => {
      return globalSearch(input);
    }),

  explore: protectedProcedure
    .use(requirePermission(Action.SEARCH_GLOBAL))
    .input(exploreListInput)
    .query(async ({ input }) => {
      return exploreList(input);
    }),

  savedSearches: protectedProcedure
    .use(requirePermission(Action.SEARCH_SAVE))
    .query(async ({ ctx }) => {
      return listSavedSearches(ctx.session.user.id);
    }),

  saveSearch: protectedProcedure
    .use(requirePermission(Action.SEARCH_SAVE))
    .input(savedSearchCreateInput)
    .mutation(async ({ input, ctx }) => {
      return createSavedSearch(input, ctx.session.user.id);
    }),

  deleteSavedSearch: protectedProcedure
    .use(requirePermission(Action.SEARCH_DELETE_OWN))
    .input(savedSearchDeleteInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await deleteSavedSearch(input.id, ctx.session.user.id);
      } catch (error) {
        handleSearchError(error);
      }
    }),
});
