import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalAIProvider } from "./local.provider";

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

describe("LocalAIProvider", () => {
  let provider: LocalAIProvider;

  beforeEach(() => {
    provider = new LocalAIProvider();
  });

  it("has name 'local'", () => {
    expect(provider.name).toBe("local");
  });

  it("reports unavailable before initialization", () => {
    // Before init is called, onnxruntime-node is not available in test env
    expect(provider.isAvailable()).toBe(false);
  });

  it("returns empty embedding when not available", async () => {
    const result = await provider.generateEmbedding("test text");
    // ONNX Runtime is not available in test environment
    expect(result.embedding).toEqual([]);
    expect(result.dimensions).toBe(0);
  });

  it("returns empty similarity results with wrong dimensions", async () => {
    const results = await provider.findSimilar([0.1, 0.2], 5);
    // Embedding size doesn't match 384 dimensions
    expect(results).toEqual([]);
  });

  it("returns empty similarity results with correct dimensions but no matches", async () => {
    const embedding = new Array(384).fill(0.1);
    const results = await provider.findSimilar(embedding, 5);
    expect(results).toEqual([]);
  });

  it("does not support text generation", () => {
    expect(provider.supportsTextGeneration()).toBe(false);
  });

  it("returns null for text generation", async () => {
    const result = await provider.generateText("test prompt");
    expect(result).toBeNull();
  });
});
