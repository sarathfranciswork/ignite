import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/server/lib/auth";
import { logger } from "@/server/lib/logger";
import { checkPermission, RbacServiceError } from "@/server/services/rbac.service";
import type { ActionType } from "@/server/lib/permissions";

export interface TRPCContext {
  session: Session | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await auth();
  return { session };
}

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  logger.debug({ userId: ctx.session.user.id }, "Authenticated request");

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

/**
 * Composable authorization middleware.
 * Checks whether the authenticated user has the required permission.
 *
 * Usage:
 *   protectedProcedure.use(requirePermission("campaign.create"))
 *
 * For resource-scoped permissions, provide a function that extracts the
 * resourceId from the procedure input:
 *   protectedProcedure
 *     .input(z.object({ campaignId: z.string() }))
 *     .use(requirePermission("campaign.update", (input) => input.campaignId))
 */
export function requirePermission<TInput = unknown>(
  action: ActionType,
  getResourceId?: (input: TInput) => string | undefined,
) {
  return t.middleware(async ({ ctx, next, input }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const userId = ctx.session.user.id;
    const resourceId = getResourceId ? getResourceId(input as TInput) : undefined;

    try {
      const allowed = await checkPermission(userId, action, resourceId);

      if (!allowed) {
        logger.warn({ userId, action, resourceId }, "Permission denied");
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action",
        });
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      if (error instanceof RbacServiceError) {
        if (error.code === "USER_DEACTIVATED") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been deactivated",
          });
        }
        if (error.code === "USER_NOT_FOUND") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not found",
          });
        }
      }

      logger.error({ err: error, userId, action }, "Permission check failed");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Permission check failed",
      });
    }

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
}
