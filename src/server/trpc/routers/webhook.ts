import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  webhookCreateInput,
  webhookUpdateInput,
  webhookGetByIdInput,
  webhookListInput,
  webhookDeleteInput,
  webhookRegenerateSecretInput,
  webhookDeliveryListInput,
  webhookTestInput,
  createWebhook,
  getWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  listWebhookDeliveries,
  testWebhook,
  getAvailableEventNames,
  WebhookServiceError,
} from "@/server/services/webhook.service";

function mapServiceError(error: unknown): never {
  if (error instanceof WebhookServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      WEBHOOK_NOT_FOUND: "NOT_FOUND",
    };
    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

export const webhookRouter = createTRPCRouter({
  create: protectedProcedure
    .use(requirePermission(Action.WEBHOOK_CREATE))
    .input(webhookCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createWebhook(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.WEBHOOK_READ))
    .input(webhookGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getWebhook(input);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.WEBHOOK_READ))
    .input(webhookListInput)
    .query(async ({ input }) => {
      try {
        return await listWebhooks(input);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.WEBHOOK_UPDATE))
    .input(webhookUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateWebhook(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.WEBHOOK_DELETE))
    .input(webhookDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteWebhook(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  regenerateSecret: protectedProcedure
    .use(requirePermission(Action.WEBHOOK_UPDATE))
    .input(webhookRegenerateSecretInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await regenerateWebhookSecret(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  deliveries: protectedProcedure
    .use(requirePermission(Action.WEBHOOK_READ))
    .input(webhookDeliveryListInput)
    .query(async ({ input }) => {
      try {
        return await listWebhookDeliveries(input);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  test: protectedProcedure
    .use(requirePermission(Action.WEBHOOK_UPDATE))
    .input(webhookTestInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await testWebhook(input, ctx.session.user.id);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  availableEvents: protectedProcedure.use(requirePermission(Action.WEBHOOK_READ)).query(() => {
    return getAvailableEventNames();
  }),
});
