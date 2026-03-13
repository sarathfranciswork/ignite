import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  slackIntegrationCreateInput,
  slackIntegrationUpdateInput,
  slackIntegrationListInput,
  slackIntegrationByIdInput,
  slackTestMessageInput,
} from "@/server/services/slack-integration.schemas";
import {
  createSlackIntegration,
  updateSlackIntegration,
  deleteSlackIntegration,
  getSlackIntegrationById,
  listSlackIntegrations,
  pauseSlackIntegration,
  activateSlackIntegration,
  sendTestMessage,
  getSlackStatus,
  getAvailableSlackEvents,
  SlackServiceError,
} from "@/server/services/slack-integration.service";

function handleSlackError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof SlackServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR"> = {
      NOT_FOUND: "NOT_FOUND",
      INVALID_EVENTS: "BAD_REQUEST",
      WEBHOOK_ERROR: "BAD_REQUEST",
      NO_WEBHOOK: "BAD_REQUEST",
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

export const slackIntegrationRouter = createTRPCRouter({
  /**
   * Get Slack integration availability status.
   */
  status: protectedProcedure.use(requirePermission(Action.SLACK_INTEGRATION_READ)).query(() => {
    return getSlackStatus();
  }),

  /**
   * Get available events for Slack subscriptions.
   */
  availableEvents: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_READ))
    .query(() => {
      return getAvailableSlackEvents();
    }),

  /**
   * List Slack integrations with cursor-based pagination.
   */
  list: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_READ))
    .input(slackIntegrationListInput)
    .query(async ({ input }) => {
      try {
        return await listSlackIntegrations(input);
      } catch (error) {
        handleSlackError(error);
      }
    }),

  /**
   * Get a Slack integration by ID.
   */
  getById: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_READ))
    .input(slackIntegrationByIdInput)
    .query(async ({ input }) => {
      try {
        return await getSlackIntegrationById(input.id);
      } catch (error) {
        handleSlackError(error);
      }
    }),

  /**
   * Create a new Slack integration.
   */
  create: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_CREATE))
    .input(slackIntegrationCreateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await createSlackIntegration(input, ctx.session.user.id);
      } catch (error) {
        handleSlackError(error);
      }
    }),

  /**
   * Update an existing Slack integration.
   */
  update: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_UPDATE))
    .input(slackIntegrationUpdateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await updateSlackIntegration(input, ctx.session.user.id);
      } catch (error) {
        handleSlackError(error);
      }
    }),

  /**
   * Delete a Slack integration.
   */
  delete: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_DELETE))
    .input(slackIntegrationByIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        await deleteSlackIntegration(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleSlackError(error);
      }
    }),

  /**
   * Pause a Slack integration.
   */
  pause: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_UPDATE))
    .input(slackIntegrationByIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await pauseSlackIntegration(input.id, ctx.session.user.id);
      } catch (error) {
        handleSlackError(error);
      }
    }),

  /**
   * Activate a Slack integration.
   */
  activate: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_UPDATE))
    .input(slackIntegrationByIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await activateSlackIntegration(input.id, ctx.session.user.id);
      } catch (error) {
        handleSlackError(error);
      }
    }),

  /**
   * Send a test message to a Slack integration webhook.
   */
  test: protectedProcedure
    .use(requirePermission(Action.SLACK_INTEGRATION_UPDATE))
    .input(slackTestMessageInput)
    .mutation(async ({ input }) => {
      try {
        await sendTestMessage(input.id);
        return { success: true };
      } catch (error) {
        handleSlackError(error);
      }
    }),
});
