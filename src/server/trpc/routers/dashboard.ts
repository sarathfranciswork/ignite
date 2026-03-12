import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  dashboardOverviewInput,
  getDashboardOverview,
  DashboardServiceError,
} from "@/server/services/dashboard.service";
import { TRPCError } from "@trpc/server";

export const dashboardRouter = createTRPCRouter({
  overview: protectedProcedure
    .use(requirePermission(Action.USER_READ_OWN))
    .input(dashboardOverviewInput)
    .query(async ({ ctx, input }) => {
      try {
        const globalRole = ctx.session.user.globalRole ?? "MEMBER";
        return await getDashboardOverview(ctx.session.user.id, globalRole, input);
      } catch (error) {
        if (error instanceof DashboardServiceError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        throw error;
      }
    }),
});
