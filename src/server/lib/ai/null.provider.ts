import {
  type AIProvider,
  type EmbeddingResult,
  type SimilarityResult,
  type TextGenerationResult,
} from "./provider";

export class NullAIProvider implements AIProvider {
  readonly name = "null";

  isAvailable(): boolean {
    return false;
  }

  supportsTextGeneration(): boolean {
    return false;
  }

  async generateEmbedding(_text: string): Promise<EmbeddingResult> {
    return { embedding: [], dimensions: 0 };
  }

  async generateText(
    _prompt: string,
    _systemPrompt?: string,
  ): Promise<TextGenerationResult | null> {
    return null;
  }

  async findSimilar(_embedding: number[], _limit: number): Promise<SimilarityResult[]> {
    return [];
  }
}
