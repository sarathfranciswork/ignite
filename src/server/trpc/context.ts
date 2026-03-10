import { getServerAuthSession } from "~/server/lib/auth";
import { db } from "~/server/lib/prisma";

export const createTRPCContext = async () => {
  const session = await getServerAuthSession();

  return {
    db,
    session,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
