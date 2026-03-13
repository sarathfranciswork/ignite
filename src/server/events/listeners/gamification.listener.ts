import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { recordActivity } from "@/server/services/gamification.service";

const childLogger = logger.child({ service: "gamification-listener" });

const globalForListeners = globalThis as unknown as {
  gamificationListenersRegistered: boolean | undefined;
};

/**
 * Register gamification event listeners.
 * Listens for idea, comment, like, and evaluation events
 * to update user scores when gamification is active.
 */
export function registerGamificationListeners(): void {
  if (globalForListeners.gamificationListenersRegistered) {
    return;
  }

  eventBus.on("idea.created", async (payload) => {
    try {
      const campaignId = payload.metadata?.campaignId as string | undefined;
      if (!campaignId) {
        childLogger.warn({ entityId: payload.entityId }, "idea.created missing campaignId");
        return;
      }
      await recordActivity({
        userId: payload.actor,
        campaignId,
        activityType: "idea",
      });
    } catch (error) {
      childLogger.error({ error, entityId: payload.entityId }, "Failed to record idea activity");
    }
  });

  eventBus.on("comment.created", async (payload) => {
    try {
      const campaignId = payload.metadata?.campaignId as string | undefined;
      if (!campaignId) {
        childLogger.warn({ entityId: payload.entityId }, "comment.created missing campaignId");
        return;
      }
      await recordActivity({
        userId: payload.actor,
        campaignId,
        activityType: "comment",
      });
    } catch (error) {
      childLogger.error({ error, entityId: payload.entityId }, "Failed to record comment activity");
    }
  });

  eventBus.on("idea.liked", async (payload) => {
    try {
      const campaignId = payload.metadata?.campaignId as string | undefined;
      if (!campaignId) {
        childLogger.warn({ entityId: payload.entityId }, "idea.liked missing campaignId");
        return;
      }
      await recordActivity({
        userId: payload.actor,
        campaignId,
        activityType: "like",
      });
    } catch (error) {
      childLogger.error({ error, entityId: payload.entityId }, "Failed to record like activity");
    }
  });

  eventBus.on("evaluation.responseSubmitted", async (payload) => {
    try {
      const campaignId = payload.metadata?.campaignId as string | undefined;
      if (!campaignId) {
        childLogger.warn(
          { entityId: payload.entityId },
          "evaluation.responseSubmitted missing campaignId",
        );
        return;
      }
      await recordActivity({
        userId: payload.actor,
        campaignId,
        activityType: "evaluation",
      });
    } catch (error) {
      childLogger.error(
        { error, entityId: payload.entityId },
        "Failed to record evaluation activity",
      );
    }
  });

  globalForListeners.gamificationListenersRegistered = true;
  childLogger.info("Gamification listeners registered");
}
