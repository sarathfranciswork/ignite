import { describe, it, expect, vi } from "vitest";
import { eventBus } from "./bus";
import { type EventMap } from "./types";

describe("EventBus", () => {
  it("should emit and receive events", () => {
    const handler = vi.fn();
    const payload: EventMap["user.registered"] = {
      user: { id: "user-1", email: "test@test.com", name: "Test" },
      actor: { id: "user-1", email: "test@test.com" },
      timestamp: new Date(),
    };

    eventBus.on("user.registered", handler);
    eventBus.emit("user.registered", payload);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(payload);

    eventBus.off("user.registered", handler);
  });

  it("should not call handler after off", () => {
    const handler = vi.fn();
    const payload: EventMap["user.login"] = {
      actor: { id: "user-1", email: "test@test.com" },
      timestamp: new Date(),
    };

    eventBus.on("user.login", handler);
    eventBus.off("user.login", handler);
    eventBus.emit("user.login", payload);

    expect(handler).not.toHaveBeenCalled();
  });
});
