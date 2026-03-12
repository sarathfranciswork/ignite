import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { dispatchEventToWebhooks, getAvailableEventNames } from "@/server/services/webhook.service";
import type { EventName, EventPayload } from "@/server/events/types";

const childLogger = logger.child({ service: "webhook-listener" });

const WEBHOOK_EVENTS: readonly string[] = getAvailableEventNames().filter(
  (e) => e !== "webhook.test",
);

export function registerWebhookListeners(): void {
  for (const eventName of WEBHOOK_EVENTS) {
    eventBus.on(eventName as EventName, (payload: EventPayload) => {
      dispatchEventToWebhooks(eventName as EventName, payload).catch((err) => {
        childLogger.error(
          { event: eventName, entityId: payload.entityId, error: err },
          "Failed to dispatch webhooks for event",
        );
      });
    });
  }

  childLogger.info({ eventCount: WEBHOOK_EVENTS.length }, "Webhook listeners registered");
}
