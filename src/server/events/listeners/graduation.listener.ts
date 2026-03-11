import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { checkAndGraduateIdea } from "@/server/services/graduation.service";

const childLogger = logger.child({ service: "graduation-listener" });

const globalForListeners = globalThis as unknown as {
  graduationListenersRegistered: boolean | undefined;
};

/**
 * Register graduation check listeners.
 * Fires synchronously on engagement events (comment, vote, like, view)
 * to check if an idea should auto-graduate to HOT status.
 */
export function registerGraduationListeners() {
  if (globalForListeners.graduationListenersRegistered) return;
  globalForListeners.graduationListenersRegistered = true;

  const handleGraduationCheck = async (ideaId: string, actor: string) => {
    try {
      const graduated = await checkAndGraduateIdea(ideaId, actor);
      if (graduated) {
        childLogger.info({ ideaId }, "Idea auto-graduated to HOT");
      }
    } catch (error) {
      childLogger.error({ error, ideaId }, "Failed graduation check");
    }
  };

  eventBus.on("comment.created", (payload) => {
    const ideaId = payload.metadata?.ideaId as string | undefined;
    if (ideaId) {
      void handleGraduationCheck(ideaId, payload.actor);
    }
  });

  eventBus.on("idea.voted", (payload) => {
    void handleGraduationCheck(payload.entityId, payload.actor);
  });

  eventBus.on("idea.liked", (payload) => {
    void handleGraduationCheck(payload.entityId, payload.actor);
  });

  childLogger.info("Graduation listeners registered");
}
