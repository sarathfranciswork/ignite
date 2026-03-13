import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { dispatchEventToTeams } from "@/server/services/teams.service";
import { TEAMS_AVAILABLE_EVENTS } from "@/server/services/teams.schemas";
import type { EventName, EventPayload } from "@/server/events/types";

const childLogger = logger.child({ service: "teams-listener" });

export function registerTeamsListeners(): void {
  for (const eventName of TEAMS_AVAILABLE_EVENTS) {
    eventBus.on(eventName as EventName, (payload: EventPayload) => {
      dispatchEventToTeams(eventName as EventName, payload).catch((err) => {
        childLogger.error(
          { event: eventName, entityId: payload.entityId, error: err },
          "Failed to dispatch Teams notifications for event",
        );
      });
    });
  }

  childLogger.info({ eventCount: TEAMS_AVAILABLE_EVENTS.length }, "Teams listeners registered");
}
