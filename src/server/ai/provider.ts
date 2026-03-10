export interface AIProvider {
  isAvailable(): boolean;
  generateEmbedding(text: string): Promise<number[]>;
  computeSimilarity(a: number[], b: number[]): number;
}
