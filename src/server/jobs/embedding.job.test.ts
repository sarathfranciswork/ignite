import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildEmbeddingText, processEmbeddingJob } from "./embedding.job";

// Mock dependencies
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("@/server/lib/ai/factory", () => ({
  aiProvider: {
    name: "test",
    isAvailable: vi.fn().mockReturnValue(false),
    generateEmbedding: vi.fn().mockResolvedValue({ embedding: [], dimensions: 0 }),
    findSimilar: vi.fn().mockResolvedValue([]),
  },
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

describe("buildEmbeddingText", () => {
  it("includes title", () => {
    const text = buildEmbeddingText({ title: "My Idea" });
    expect(text).toContain("My Idea");
  });

  it("includes teaser when present", () => {
    const text = buildEmbeddingText({ title: "Title", teaser: "A short teaser" });
    expect(text).toContain("A short teaser");
  });

  it("strips HTML from description", () => {
    const text = buildEmbeddingText({
      title: "Title",
      description: "<p>Hello <strong>world</strong></p>",
    });
    expect(text).toContain("Hello");
    expect(text).toContain("world");
    expect(text).not.toContain("<p>");
    expect(text).not.toContain("<strong>");
  });

  it("includes category when present", () => {
    const text = buildEmbeddingText({ title: "Title", category: "Innovation" });
    expect(text).toContain("Innovation");
  });

  it("includes tags", () => {
    const text = buildEmbeddingText({ title: "Title", tags: ["ai", "ml"] });
    expect(text).toContain("ai");
    expect(text).toContain("ml");
  });

  it("combines all fields", () => {
    const text = buildEmbeddingText({
      title: "Smart Widget",
      teaser: "A widget that learns",
      description: "Uses ML to optimize",
      tags: ["ai", "widget"],
      category: "Tech",
    });

    expect(text).toContain("Smart Widget");
    expect(text).toContain("A widget that learns");
    expect(text).toContain("Uses ML to optimize");
    expect(text).toContain("Tech");
    expect(text).toContain("ai");
    expect(text).toContain("widget");
  });

  it("truncates to max length", () => {
    const longTitle = "a".repeat(9000);
    const text = buildEmbeddingText({ title: longTitle });
    expect(text.length).toBeLessThanOrEqual(8000);
  });
});

describe("processEmbeddingJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when AI provider is unavailable", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.isAvailable).mockReturnValue(false);

    await processEmbeddingJob({ ideaId: "idea-1", text: "test text" });

    expect(aiProvider.generateEmbedding).not.toHaveBeenCalled();
  });

  it("skips when text is empty", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);

    await processEmbeddingJob({ ideaId: "idea-1", text: "   " });

    expect(aiProvider.generateEmbedding).not.toHaveBeenCalled();
  });

  it("generates and stores embedding when AI is available", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    const mockEmbedding = [0.1, 0.2, 0.3];
    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);
    vi.mocked(aiProvider.generateEmbedding).mockResolvedValue({
      embedding: mockEmbedding,
      dimensions: 3,
    });

    await processEmbeddingJob({ ideaId: "idea-1", text: "test text" });

    expect(aiProvider.generateEmbedding).toHaveBeenCalledWith("test text");
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      "UPDATE ideas SET embedding = $1::vector WHERE id = $2",
      "[0.1,0.2,0.3]",
      "idea-1",
    );
  });

  it("skips storage when empty embedding returned", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);
    vi.mocked(aiProvider.generateEmbedding).mockResolvedValue({
      embedding: [],
      dimensions: 0,
    });

    await processEmbeddingJob({ ideaId: "idea-1", text: "test text" });

    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
