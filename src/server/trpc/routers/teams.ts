import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  teamsIntegrationCreateInput,
  teamsIntegrationUpdateInput,
  teamsIntegrationListInput,
  teamsIntegrationByIdInput,
  teamsTestMessageInput,
} from "@/server/services/teams.schemas";
import {
  createTeamsIntegration,
  updateTeamsIntegration,
  deleteTeamsIntegration,
  getTeamsIntegrationById,
  listTeamsIntegrations,
  pauseTeamsIntegration,
  activateTeamsIntegration,
  sendTestMessage,
  getTeamsStatus,
  getAvailableTeamsEvents,
  TeamsServiceError,
} from "@/server/services/teams.service";

function handleTeamsError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof TeamsServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR"> = {
      NOT_FOUND: "NOT_FOUND",
      INVALID_EVENTS: "BAD_REQUEST",
      WEBHOOK_ERROR: "BAD_REQUEST",
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

export const teamsRouter = createTRPCRouter({
  /**
   * Get Teams integration availability status.
   */
  status: protectedProcedure.use(requirePermission(Action.TEAMS_INTEGRATION_READ)).query(() => {
    return getTeamsStatus();
  }),

  /**
   * Get available events for Teams subscriptions.
   */
  availableEvents: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_READ))
    .query(() => {
      return getAvailableTeamsEvents();
    }),

  /**
   * List Teams integrations with cursor-based pagination.
   */
  list: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_READ))
    .input(teamsIntegrationListInput)
    .query(async ({ input }) => {
      try {
        return await listTeamsIntegrations(input);
      } catch (error) {
        handleTeamsError(error);
      }
    }),

  /**
   * Get a Teams integration by ID.
   */
  getById: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_READ))
    .input(teamsIntegrationByIdInput)
    .query(async ({ input }) => {
      try {
        return await getTeamsIntegrationById(input.id);
      } catch (error) {
        handleTeamsError(error);
      }
    }),

  /**
   * Create a new Teams integration.
   */
  create: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_CREATE))
    .input(teamsIntegrationCreateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await createTeamsIntegration(input, ctx.session.user.id);
      } catch (error) {
        handleTeamsError(error);
      }
    }),

  /**
   * Update an existing Teams integration.
   */
  update: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_UPDATE))
    .input(teamsIntegrationUpdateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await updateTeamsIntegration(input, ctx.session.user.id);
      } catch (error) {
        handleTeamsError(error);
      }
    }),

  /**
   * Delete a Teams integration.
   */
  delete: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_DELETE))
    .input(teamsIntegrationByIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        await deleteTeamsIntegration(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleTeamsError(error);
      }
    }),

  /**
   * Pause a Teams integration.
   */
  pause: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_UPDATE))
    .input(teamsIntegrationByIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await pauseTeamsIntegration(input.id, ctx.session.user.id);
      } catch (error) {
        handleTeamsError(error);
      }
    }),

  /**
   * Activate a Teams integration.
   */
  activate: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_UPDATE))
    .input(teamsIntegrationByIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await activateTeamsIntegration(input.id, ctx.session.user.id);
      } catch (error) {
        handleTeamsError(error);
      }
    }),

  /**
   * Send a test message to a Teams integration webhook.
   */
  test: protectedProcedure
    .use(requirePermission(Action.TEAMS_INTEGRATION_UPDATE))
    .input(teamsTestMessageInput)
    .mutation(async ({ input }) => {
      try {
        await sendTestMessage(input.id);
        return { success: true };
      } catch (error) {
        handleTeamsError(error);
      }
    }),
});
