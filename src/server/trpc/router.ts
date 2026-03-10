import { router } from "./trpc";
import { partnerRouter } from "./routers/partner";

export const appRouter = router({
  partner: partnerRouter,
});

export type AppRouter = typeof appRouter;
