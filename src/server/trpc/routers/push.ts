import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  pushSubscriptionSubscribeInput,
  pushSubscriptionUnsubscribeInput,
  subscribe,
  unsubscribe,
  listSubscriptions,
  getVapidPublicKey,
  PushServiceError,
} from "@/server/services/push.service";

function handlePushError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof PushServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "FORBIDDEN"> = {
      SUBSCRIPTION_NOT_FOUND: "NOT_FOUND",
      NOT_AUTHORIZED: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const pushRouter = createTRPCRouter({
  getVapidPublicKey: protectedProcedure
    .use(requirePermission(Action.PUSH_READ_OWN))
    .query(async () => {
      const key = await getVapidPublicKey();
      return { vapidPublicKey: key };
    }),

  subscribe: protectedProcedure
    .use(requirePermission(Action.PUSH_SUBSCRIBE))
    .input(pushSubscriptionSubscribeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        return await subscribe(userId, input);
      } catch (error) {
        handlePushError(error);
      }
    }),

  unsubscribe: protectedProcedure
    .use(requirePermission(Action.PUSH_SUBSCRIBE))
    .input(pushSubscriptionUnsubscribeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        return await unsubscribe(userId, input);
      } catch (error) {
        handlePushError(error);
      }
    }),

  listSubscriptions: protectedProcedure
    .use(requirePermission(Action.PUSH_READ_OWN))
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      return listSubscriptions(userId);
    }),
});
