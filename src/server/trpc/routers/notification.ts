import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  notificationListInput,
  notificationMarkReadInput,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  NotificationServiceError,
} from "@/server/services/notification.service";

function handleNotificationError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof NotificationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "FORBIDDEN"> = {
      NOTIFICATION_NOT_FOUND: "NOT_FOUND",
      NOT_AUTHORIZED: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .input(notificationListInput)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return listNotifications(userId, input);
    }),

  unreadCount: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const count = await getUnreadCount(userId);
      return { count };
    }),

  markAsRead: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .input(notificationMarkReadInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        return await markAsRead(userId, input);
      } catch (error) {
        handleNotificationError(error);
      }
    }),

  markAllAsRead: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      return markAllAsRead(userId);
    }),
});
