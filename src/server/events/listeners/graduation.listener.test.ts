import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/services/graduation.service", () => ({
  checkAndGraduateIdea: vi.fn(),
}));

// Create a mock event bus with handler tracking
const handlers = new Map<string, Array<(payload: Record<string, unknown>) => void>>();

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    on: vi.fn((event: string, handler: (payload: Record<string, unknown>) => void) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(handler);
    }),
    emit: vi.fn(),
  },
}));

const { checkAndGraduateIdea } = await import("@/server/services/graduation.service");

describe("graduation listener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();

    // Reset the global registration flag
    const g = globalThis as unknown as Record<string, unknown>;
    g.graduationListenersRegistered = undefined;
  });

  it("registers listeners for engagement events", async () => {
    const { registerGraduationListeners } = await import("./graduation.listener");
    registerGraduationListeners();

    expect(handlers.has("comment.created")).toBe(true);
    expect(handlers.has("idea.voted")).toBe(true);
    expect(handlers.has("idea.liked")).toBe(true);
  });

  it("calls checkAndGraduateIdea on comment.created", async () => {
    const { registerGraduationListeners } = await import("./graduation.listener");
    registerGraduationListeners();

    const commentHandlers = handlers.get("comment.created")!;
    expect(commentHandlers.length).toBeGreaterThan(0);

    for (const handler of commentHandlers) {
      handler({
        entity: "comment",
        entityId: "comment-1",
        actor: "user-1",
        timestamp: new Date().toISOString(),
        metadata: { ideaId: "idea-1", campaignId: "campaign-1" },
      });
    }

    // Allow async handler to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(checkAndGraduateIdea).toHaveBeenCalledWith("idea-1", "user-1");
  });

  it("calls checkAndGraduateIdea on idea.voted", async () => {
    const { registerGraduationListeners } = await import("./graduation.listener");
    registerGraduationListeners();

    const voteHandlers = handlers.get("idea.voted")!;
    for (const handler of voteHandlers) {
      handler({
        entity: "idea",
        entityId: "idea-2",
        actor: "user-2",
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(checkAndGraduateIdea).toHaveBeenCalledWith("idea-2", "user-2");
  });

  it("calls checkAndGraduateIdea on idea.liked", async () => {
    const { registerGraduationListeners } = await import("./graduation.listener");
    registerGraduationListeners();

    const likeHandlers = handlers.get("idea.liked")!;
    for (const handler of likeHandlers) {
      handler({
        entity: "idea",
        entityId: "idea-3",
        actor: "user-3",
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(checkAndGraduateIdea).toHaveBeenCalledWith("idea-3", "user-3");
  });
});
