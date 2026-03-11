import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock all dependencies before imports
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/ai/factory", () => ({
  aiProvider: {
    name: "test",
    isAvailable: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("@/server/jobs/embedding-queue", () => ({
  enqueueEmbedding: vi.fn(),
}));

vi.mock("@/server/jobs/embedding.job", () => ({
  buildEmbeddingText: vi.fn().mockReturnValue("test embedding text"),
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Use a real EventEmitter for testing
vi.mock("@/server/events/event-bus", async () => {
  const { EventEmitter } = await import("events");
  const emitter = new EventEmitter();
  return {
    eventBus: {
      on: (event: string, handler: (...args: unknown[]) => void) => emitter.on(event, handler),
      off: (event: string, handler: (...args: unknown[]) => void) => emitter.off(event, handler),
      emit: (event: string, payload: unknown) => emitter.emit(event, payload),
    },
  };
});

describe("EmbeddingListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the global flag so listeners can be re-registered
    const g = globalThis as Record<string, unknown>;
    g.embeddingListenersRegistered = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers listeners without errors", async () => {
    const { registerEmbeddingListeners } = await import("./embedding.listener");
    expect(() => registerEmbeddingListeners()).not.toThrow();
  });

  it("does not enqueue embedding when AI is unavailable", async () => {
    const { registerEmbeddingListeners } = await import("./embedding.listener");
    const { eventBus } = await import("@/server/events/event-bus");
    const { enqueueEmbedding } = await import("@/server/jobs/embedding-queue");

    registerEmbeddingListeners();

    eventBus.emit("idea.submitted", {
      entity: "idea",
      entityId: "idea-1",
      actor: "user-1",
      timestamp: new Date().toISOString(),
    });

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 50));

    expect(enqueueEmbedding).not.toHaveBeenCalled();
  });

  it("enqueues embedding when AI is available and idea exists", async () => {
    const { registerEmbeddingListeners } = await import("./embedding.listener");
    const { eventBus } = await import("@/server/events/event-bus");
    const { enqueueEmbedding } = await import("@/server/jobs/embedding-queue");
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);
    vi.mocked(prisma.idea.findUnique).mockResolvedValue({
      id: "idea-1",
      title: "Test Idea",
      teaser: null,
      description: null,
      tags: [],
      category: null,
    } as unknown as Awaited<ReturnType<typeof prisma.idea.findUnique>>);

    registerEmbeddingListeners();

    eventBus.emit("idea.submitted", {
      entity: "idea",
      entityId: "idea-1",
      actor: "user-1",
      timestamp: new Date().toISOString(),
    });

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 50));

    expect(enqueueEmbedding).toHaveBeenCalledWith(expect.objectContaining({ ideaId: "idea-1" }));
  });
});
