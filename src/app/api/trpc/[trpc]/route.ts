import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/routers/root";
import { createTRPCContext } from "@/server/trpc/trpc";
import { registerNotificationListeners } from "@/server/events/listeners/notification.listener";
import { registerGraduationListeners } from "@/server/events/listeners/graduation.listener";
import { registerActivityListeners } from "@/server/events/listeners/activity.listener";
import { registerEmbeddingListeners } from "@/server/events/listeners/embedding.listener";
import { registerPushListeners } from "@/server/events/listeners/push.listener";
import { registerAuditLogListeners } from "@/server/events/listeners/audit-log.listener";
import { registerSlackListeners } from "@/server/events/listeners/slack.listener";
import { registerTeamsListeners } from "@/server/events/listeners/teams.listener";
import { registerGamificationListeners } from "@/server/events/listeners/gamification.listener";
import { initializeJobWorkers } from "@/server/jobs/init";

registerNotificationListeners();
registerGraduationListeners();
registerActivityListeners();
registerEmbeddingListeners();
registerPushListeners();
registerAuditLogListeners();
registerSlackListeners();
registerTeamsListeners();
registerGamificationListeners();
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
