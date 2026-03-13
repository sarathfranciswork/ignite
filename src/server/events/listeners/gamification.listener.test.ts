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

const mockRecordActivity = vi.fn();
vi.mock("@/server/services/gamification.service", () => ({
  recordActivity: (...args: unknown[]) => mockRecordActivity(...args),
}));

// Reset listener registration state before import
const globalForListeners = globalThis as unknown as {
  gamificationListenersRegistered: boolean | undefined;
};
globalForListeners.gamificationListenersRegistered = undefined;

// Use a real event bus for testing
const { EventEmitter } = await import("events");
const mockEmitter = new EventEmitter();
mockEmitter.setMaxListeners(50);

const handlers: Record<string, (payload: Record<string, unknown>) => void> = {};

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    on: vi.fn((event: string, handler: (payload: Record<string, unknown>) => void) => {
      handlers[event] = handler;
    }),
    emit: vi.fn(),
  },
}));

const { registerGamificationListeners } = await import("./gamification.listener");

describe("gamification listener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers listeners for gamification events", () => {
    globalForListeners.gamificationListenersRegistered = undefined;
    registerGamificationListeners();

    expect(handlers["idea.created"]).toBeDefined();
    expect(handlers["comment.created"]).toBeDefined();
    expect(handlers["idea.liked"]).toBeDefined();
    expect(handlers["evaluation.responseSubmitted"]).toBeDefined();
  });

  it("records idea activity on idea.created", async () => {
    mockRecordActivity.mockResolvedValueOnce({ id: "score-1" });

    await handlers["idea.created"]({
      entity: "Idea",
      entityId: "idea-1",
      actor: "user-1",
      timestamp: new Date().toISOString(),
      metadata: { campaignId: "campaign-1" },
    });

    expect(mockRecordActivity).toHaveBeenCalledWith({
      userId: "user-1",
      campaignId: "campaign-1",
      activityType: "idea",
    });
  });

  it("records comment activity on comment.created", async () => {
    mockRecordActivity.mockResolvedValueOnce({ id: "score-1" });

    await handlers["comment.created"]({
      entity: "Comment",
      entityId: "comment-1",
      actor: "user-1",
      timestamp: new Date().toISOString(),
      metadata: { campaignId: "campaign-1" },
    });

    expect(mockRecordActivity).toHaveBeenCalledWith({
      userId: "user-1",
      campaignId: "campaign-1",
      activityType: "comment",
    });
  });

  it("records like activity on idea.liked", async () => {
    mockRecordActivity.mockResolvedValueOnce({ id: "score-1" });

    await handlers["idea.liked"]({
      entity: "IdeaLike",
      entityId: "like-1",
      actor: "user-1",
      timestamp: new Date().toISOString(),
      metadata: { campaignId: "campaign-1" },
    });

    expect(mockRecordActivity).toHaveBeenCalledWith({
      userId: "user-1",
      campaignId: "campaign-1",
      activityType: "like",
    });
  });

  it("records evaluation activity on evaluation.responseSubmitted", async () => {
    mockRecordActivity.mockResolvedValueOnce({ id: "score-1" });

    await handlers["evaluation.responseSubmitted"]({
      entity: "EvaluationResponse",
      entityId: "resp-1",
      actor: "user-1",
      timestamp: new Date().toISOString(),
      metadata: { campaignId: "campaign-1" },
    });

    expect(mockRecordActivity).toHaveBeenCalledWith({
      userId: "user-1",
      campaignId: "campaign-1",
      activityType: "evaluation",
    });
  });

  it("skips activity when campaignId is missing", async () => {
    await handlers["idea.created"]({
      entity: "Idea",
      entityId: "idea-1",
      actor: "user-1",
      timestamp: new Date().toISOString(),
    });

    expect(mockRecordActivity).not.toHaveBeenCalled();
  });

  it("handles errors gracefully", async () => {
    mockRecordActivity.mockRejectedValueOnce(new Error("DB error"));

    // Should not throw
    await handlers["idea.created"]({
      entity: "Idea",
      entityId: "idea-1",
      actor: "user-1",
      timestamp: new Date().toISOString(),
      metadata: { campaignId: "campaign-1" },
    });

    expect(mockRecordActivity).toHaveBeenCalled();
  });
});
