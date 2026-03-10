import { type AIProvider } from "./provider";

export class NullAIProvider implements AIProvider {
  isAvailable(): boolean {
    return false;
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    return [];
  }

  computeSimilarity(_a: number[], _b: number[]): number {
    return 0;
  }
}
