import { type AIProvider, type EmbeddingResult, type SimilarityResult } from "./provider";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";

const childLogger = logger.child({ service: "openai-ai-provider" });

const TARGET_DIMENSIONS = 384;

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAIProvider uses the OpenAI Embeddings API (text-embedding-3-small)
 * with dimensional reduction to 384 dimensions to match LocalAIProvider.
 *
 * Requires OPENAI_API_KEY environment variable.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl ?? "https://api.openai.com/v1";
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-3-small",
          dimensions: TARGET_DIMENSIONS,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        childLogger.error(
          { status: response.status, body: errorBody },
          "OpenAI embedding API request failed",
        );
        return { embedding: [], dimensions: 0 };
      }

      const data = (await response.json()) as OpenAIEmbeddingResponse;

      if (!data.data?.[0]?.embedding) {
        childLogger.error("OpenAI response missing embedding data");
        return { embedding: [], dimensions: 0 };
      }

      const embedding = data.data[0].embedding;

      childLogger.debug(
        { tokens: data.usage?.total_tokens, dimensions: embedding.length },
        "OpenAI embedding generated",
      );

      return {
        embedding,
        dimensions: embedding.length,
      };
    } catch (error) {
      childLogger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to generate OpenAI embedding",
      );
      return { embedding: [], dimensions: 0 };
    }
  }

  async findSimilar(embedding: number[], limit: number): Promise<SimilarityResult[]> {
    if (embedding.length !== TARGET_DIMENSIONS) {
      return [];
    }

    try {
      const vectorStr = `[${embedding.join(",")}]`;
      const results = await prisma.$queryRawUnsafe<Array<{ id: string; distance: number }>>(
        `SELECT id, embedding <=> $1::vector AS distance
         FROM ideas
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        vectorStr,
        limit,
      );

      return results.map((r) => ({
        id: r.id,
        score: 1 - r.distance,
      }));
    } catch (error) {
      childLogger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to find similar ideas via pgvector",
      );
      return [];
    }
  }
}
