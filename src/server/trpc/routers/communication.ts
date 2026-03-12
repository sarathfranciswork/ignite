import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  campaignMessageCreateInput,
  campaignMessageSendInput,
  campaignMessageGetByIdInput,
  campaignMessageListInput,
  campaignMessageUpdateInput,
  campaignMessageDeleteInput,
  communicationLogListInput,
  recipientPreviewInput,
  createCampaignMessage,
  updateCampaignMessage,
  deleteCampaignMessage,
  getCampaignMessage,
  listCampaignMessages,
  sendCampaignMessage,
  listCommunicationLogs,
  previewRecipients,
  CommunicationServiceError,
} from "@/server/services/communication.service";

function mapServiceError(error: unknown): never {
  if (error instanceof CommunicationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      MESSAGE_NOT_FOUND: "NOT_FOUND",
      ALREADY_SENT: "BAD_REQUEST",
    };
    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

export const communicationRouter = createTRPCRouter({
  create: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.COMMUNICATION_CREATE,
        (input) => input.campaignId,
      ),
    )
    .input(campaignMessageCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCampaignMessage(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.COMMUNICATION_CREATE))
    .input(campaignMessageUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCampaignMessage(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.COMMUNICATION_DELETE))
    .input(campaignMessageDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteCampaignMessage(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.COMMUNICATION_READ))
    .input(campaignMessageGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getCampaignMessage(input);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  list: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.COMMUNICATION_READ,
        (input) => input.campaignId,
      ),
    )
    .input(campaignMessageListInput)
    .query(async ({ input }) => {
      try {
        return await listCampaignMessages(input);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  send: protectedProcedure
    .use(requirePermission(Action.COMMUNICATION_SEND))
    .input(campaignMessageSendInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendCampaignMessage(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  previewRecipients: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(
        Action.COMMUNICATION_READ,
        (input) => input.campaignId,
      ),
    )
    .input(recipientPreviewInput)
    .query(async ({ input }) => {
      return await previewRecipients(input);
    }),

  logs: protectedProcedure
    .use(requirePermission(Action.COMMUNICATION_READ))
    .input(communicationLogListInput)
    .query(async ({ input }) => {
      return await listCommunicationLogs(input);
    }),
});
