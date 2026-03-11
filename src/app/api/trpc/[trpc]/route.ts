import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/routers/root";
import { createTRPCContext } from "@/server/trpc/trpc";
import { registerNotificationListeners } from "@/server/events/listeners/notification.listener";
import { registerGraduationListeners } from "@/server/events/listeners/graduation.listener";
import { registerActivityListeners } from "@/server/events/listeners/activity.listener";

registerNotificationListeners();
registerGraduationListeners();
registerActivityListeners();

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });
}

export { handler as GET, handler as POST };
