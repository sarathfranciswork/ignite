import { EventEmitter } from "events";
import { type EventMap, type EventName } from "./types";
import { logger } from "~/server/lib/logger";

class EventBus {
  private emitter = new EventEmitter();

  emit<T extends EventName>(event: T, payload: EventMap[T]): void {
    logger.debug(`Event emitted: ${event}`, {
      event,
      actor: payload.actor.id,
    });
    this.emitter.emit(event, payload);
  }

  on<T extends EventName>(
    event: T,
    handler: (payload: EventMap[T]) => void,
  ): void {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
  }

  off<T extends EventName>(
    event: T,
    handler: (payload: EventMap[T]) => void,
  ): void {
    this.emitter.off(event, handler as (...args: unknown[]) => void);
  }
}

const globalForEventBus = globalThis as unknown as {
  eventBus: EventBus | undefined;
};

export const eventBus = globalForEventBus.eventBus ?? new EventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.eventBus = eventBus;
}
