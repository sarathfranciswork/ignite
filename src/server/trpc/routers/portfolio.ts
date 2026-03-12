import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  portfolioListInput,
  portfolioCreateInput,
  portfolioUpdateInput,
  portfolioGetByIdInput,
  portfolioDeleteInput,
  portfolioAddItemInput,
  portfolioRemoveItemInput,
  portfolioReorderItemsInput,
  portfolioAnalyticsInput,
} from "@/server/services/portfolio.schemas";
import {
  listPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  addItemToPortfolio,
  removeItemFromPortfolio,
  reorderPortfolioItems,
  getPortfolioAnalytics,
  PortfolioServiceError,
} from "@/server/services/portfolio.service";

function handlePortfolioError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof PortfolioServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      PORTFOLIO_NOT_FOUND: "NOT_FOUND",
      ENTITY_NOT_FOUND: "NOT_FOUND",
      ITEM_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const portfolioRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_READ))
    .input(portfolioListInput)
    .query(async ({ input }) => {
      return listPortfolios(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_READ))
    .input(portfolioGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getPortfolioById(input.id);
      } catch (error) {
        handlePortfolioError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_CREATE))
    .input(portfolioCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createPortfolio(input, ctx.session.user.id);
      } catch (error) {
        handlePortfolioError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_UPDATE))
    .input(portfolioUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updatePortfolio(input, ctx.session.user.id);
      } catch (error) {
        handlePortfolioError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_DELETE))
    .input(portfolioDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deletePortfolio(input.id, ctx.session.user.id);
      } catch (error) {
        handlePortfolioError(error);
      }
    }),

  addItem: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_UPDATE))
    .input(portfolioAddItemInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addItemToPortfolio(input, ctx.session.user.id);
      } catch (error) {
        handlePortfolioError(error);
      }
    }),

  removeItem: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_UPDATE))
    .input(portfolioRemoveItemInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeItemFromPortfolio(input, ctx.session.user.id);
      } catch (error) {
        handlePortfolioError(error);
      }
    }),

  reorderItems: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_UPDATE))
    .input(portfolioReorderItemsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await reorderPortfolioItems(input, ctx.session.user.id);
      } catch (error) {
        handlePortfolioError(error);
      }
    }),

  analytics: protectedProcedure
    .use(requirePermission(Action.PORTFOLIO_READ))
    .input(portfolioAnalyticsInput)
    .query(async ({ input }) => {
      try {
        return await getPortfolioAnalytics(input.id);
      } catch (error) {
        handlePortfolioError(error);
      }
    }),
});
