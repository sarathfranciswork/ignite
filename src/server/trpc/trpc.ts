import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { PrismaClient } from "@prisma/client";

export interface TRPCContext {
  db: PrismaClient;
  userId: string | null;
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/** Procedure that requires authentication */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});
