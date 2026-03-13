import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { dispatchEventToSlack } from "@/server/services/slack-integration.service";
import { SLACK_AVAILABLE_EVENTS } from "@/server/services/slack-integration.schemas";
import type { EventName, EventPayload } from "@/server/events/types";

const childLogger = logger.child({ service: "slack-listener" });

export function registerSlackListeners(): void {
  for (const eventName of SLACK_AVAILABLE_EVENTS) {
    eventBus.on(eventName as EventName, (payload: EventPayload) => {
      dispatchEventToSlack(eventName as EventName, payload).catch((err) => {
        childLogger.error(
          { event: eventName, entityId: payload.entityId, error: err },
          "Failed to dispatch Slack notifications for event",
        );
      });
    });
  }

  childLogger.info({ eventCount: SLACK_AVAILABLE_EVENTS.length }, "Slack listeners registered");
}
