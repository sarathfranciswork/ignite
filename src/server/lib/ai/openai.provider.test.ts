import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIProvider } from "./openai.provider";

// Mock the prisma client
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  },
}));

// Mock the logger
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

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider("test-api-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has name 'openai'", () => {
    expect(provider.name).toBe("openai");
  });

  it("reports available when API key is provided", () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it("reports unavailable when API key is empty", () => {
    const emptyProvider = new OpenAIProvider("");
    expect(emptyProvider.isAvailable()).toBe(false);
  });

  it("generates embedding from OpenAI API", async () => {
    const mockEmbedding = new Array(384).fill(0.01);
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0 }],
        model: "text-embedding-3-small",
        usage: { prompt_tokens: 5, total_tokens: 5 },
      }),
    };

    vi.spyOn(global, "fetch").mockResolvedValue(mockResponse as unknown as Response);

    const result = await provider.generateEmbedding("test text");

    expect(result.embedding).toEqual(mockEmbedding);
    expect(result.dimensions).toBe(384);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  it("returns empty embedding on API error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue("Rate limited"),
    } as unknown as Response);

    const result = await provider.generateEmbedding("test text");

    expect(result.embedding).toEqual([]);
    expect(result.dimensions).toBe(0);
  });

  it("returns empty embedding on network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await provider.generateEmbedding("test text");

    expect(result.embedding).toEqual([]);
    expect(result.dimensions).toBe(0);
  });

  it("returns empty similarity results with wrong dimensions", async () => {
    const results = await provider.findSimilar([0.1, 0.2], 5);
    expect(results).toEqual([]);
  });

  it("queries pgvector for similar ideas with correct dimensions", async () => {
    const { prisma } = await import("@/server/lib/prisma");
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([
      { id: "idea-1", distance: 0.2 },
      { id: "idea-2", distance: 0.4 },
    ]);

    const embedding = new Array(384).fill(0.01);
    const results = await provider.findSimilar(embedding, 5);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ id: "idea-1", score: 0.8 });
    expect(results[1]).toEqual({ id: "idea-2", score: 0.6 });
  });
});
