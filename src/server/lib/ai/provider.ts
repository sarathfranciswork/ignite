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
  success: boolean;
}

export interface AIProvider {
  readonly name: string;

  isAvailable(): boolean;

  supportsTextGeneration(): boolean;

  generateEmbedding(text: string): Promise<EmbeddingResult>;

  findSimilar(embedding: number[], limit: number): Promise<SimilarityResult[]>;

  generateText(prompt: string, systemPrompt?: string): Promise<TextGenerationResult>;
}
