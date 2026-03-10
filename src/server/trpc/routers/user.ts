import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import {
  updateProfileInput,
  getUserProfile,
  updateUserProfile,
  UserServiceError,
} from "@/server/services/user.service";
import { Action } from "@/server/lib/permissions";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure
    .use(requirePermission(Action.USER_READ_OWN))
    .query(async ({ ctx }) => {
      try {
        return await getUserProfile(ctx.session.user.id);
      } catch (error) {
        if (error instanceof UserServiceError && error.code === "USER_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        throw error;
      }
    }),

  updateProfile: protectedProcedure
    .use(requirePermission(Action.USER_UPDATE_OWN))
    .input(updateProfileInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUserProfile(ctx.session.user.id, input);
      } catch (error) {
        if (error instanceof UserServiceError && error.code === "USER_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        throw error;
      }
    }),
});
