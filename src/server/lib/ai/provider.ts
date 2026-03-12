export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

export interface SimilarityResult {
  id: string;
  score: number;
}

export interface TextGenerationResult {
  text: string;
  finishReason: "stop" | "length" | "error";
}

export interface AIProvider {
  readonly name: string;

  isAvailable(): boolean;

  supportsTextGeneration(): boolean;

  generateEmbedding(text: string): Promise<EmbeddingResult>;

  generateText(prompt: string, systemPrompt?: string): Promise<TextGenerationResult | null>;

  findSimilar(embedding: number[], limit: number): Promise<SimilarityResult[]>;
}
