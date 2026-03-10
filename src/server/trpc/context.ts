import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export function createTRPCContext(_opts: FetchCreateContextFnOptions) {
  // Session/auth will be added in Story 1.2
  return {
    // session: null,
    // user: null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
