import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/routers/root";
import { createTRPCContext } from "@/server/trpc/trpc";
import { registerNotificationListeners } from "@/server/events/listeners/notification.listener";
import { registerGraduationListeners } from "@/server/events/listeners/graduation.listener";
import { registerActivityListeners } from "@/server/events/listeners/activity.listener";
import { registerEmbeddingListeners } from "@/server/events/listeners/embedding.listener";
import { initializeJobWorkers } from "@/server/jobs/init";

registerNotificationListeners();
registerGraduationListeners();
registerActivityListeners();
registerEmbeddingListeners();
initializeJobWorkers().catch(() => {
  // Initialization errors are logged internally — non-blocking
});

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });
}

export { handler as GET, handler as POST };
