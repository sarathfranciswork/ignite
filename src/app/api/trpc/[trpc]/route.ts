import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/routers/root";
import { createTRPCContext } from "@/server/trpc/trpc";
import { logger } from "@/server/lib/logger";

let listenersInitialized = false;

async function initListeners() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  try {
    const [
      { registerNotificationListeners },
      { registerGraduationListeners },
      { registerActivityListeners },
      { registerEmbeddingListeners },
      { registerPushListeners },
      { registerAuditLogListeners },
      { registerSlackListeners },
      { registerTeamsListeners },
      { registerGamificationListeners },
      { initializeJobWorkers },
    ] = await Promise.all([
      import("@/server/events/listeners/notification.listener"),
      import("@/server/events/listeners/graduation.listener"),
      import("@/server/events/listeners/activity.listener"),
      import("@/server/events/listeners/embedding.listener"),
      import("@/server/events/listeners/push.listener"),
      import("@/server/events/listeners/audit-log.listener"),
      import("@/server/events/listeners/slack.listener"),
      import("@/server/events/listeners/teams.listener"),
      import("@/server/events/listeners/gamification.listener"),
      import("@/server/jobs/init"),
    ]);

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
  } catch (err) {
    listenersInitialized = false;
    logger.error({ err }, "Failed to initialize event listeners");
  }
}

async function handler(req: Request) {
  await initListeners();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });
}

export { handler as GET, handler as POST };
