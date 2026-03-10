import type { inferAsyncReturnType } from "@trpc/server";

export async function createContext() {
  // TODO: Extract session from request headers once auth is implemented
  return {
    // session will be added when NextAuth is integrated
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
