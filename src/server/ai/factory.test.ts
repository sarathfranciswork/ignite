import { describe, it, expect } from "vitest";
import { getAIProvider } from "./factory";

describe("AIProvider Factory", () => {
  it("should return NullAIProvider by default", () => {
    const provider = getAIProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it("should return empty embeddings from NullAIProvider", async () => {
    const provider = getAIProvider();
    const embedding = await provider.generateEmbedding("test text");
    expect(embedding).toEqual([]);
  });

  it("should return 0 similarity from NullAIProvider", () => {
    const provider = getAIProvider();
    const similarity = provider.computeSimilarity([1, 2, 3], [4, 5, 6]);
    expect(similarity).toBe(0);
  });
});
