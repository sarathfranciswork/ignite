import { prisma } from "@/server/lib/prisma";
import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";

const childLogger = logger.child({ service: "embedding-job" });

export interface EmbeddingJobPayload {
  ideaId: string;
  text: string;
}

/**
 * Process an embedding generation job for a single idea.
 *
 * Generates an embedding vector from the idea's text content,
 * then stores it in the pgvector column on the ideas table.
 */
export async function processEmbeddingJob(payload: EmbeddingJobPayload): Promise<void> {
  const { ideaId, text } = payload;

  if (!aiProvider.isAvailable()) {
    childLogger.debug({ ideaId }, "AI provider unavailable — skipping embedding generation");
    return;
  }

  if (!text.trim()) {
    childLogger.debug({ ideaId }, "Empty text — skipping embedding generation");
    return;
  }

  try {
    const result = await aiProvider.generateEmbedding(text);

    if (result.embedding.length === 0) {
      childLogger.warn({ ideaId }, "Empty embedding returned — skipping storage");
      return;
    }

    // Store embedding using raw SQL since Prisma doesn't support vector type natively
    const vectorStr = `[${result.embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE ideas SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      ideaId,
    );

    childLogger.info(
      { ideaId, dimensions: result.dimensions, provider: aiProvider.name },
      "Embedding generated and stored",
    );
  } catch (error) {
    childLogger.error(
      {
        ideaId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to process embedding job",
    );
  }
}

/**
 * Build the text input for embedding generation from an idea's content.
 * Combines title, teaser, description, tags, and category into a single string.
 */
export function buildEmbeddingText(idea: {
  title: string;
  teaser?: string | null;
  description?: string | null;
  tags?: string[];
  category?: string | null;
}): string {
  const parts: string[] = [idea.title];

  if (idea.teaser) {
    parts.push(idea.teaser);
  }

  if (idea.description) {
    // Strip basic HTML tags if present (TipTap content)
    const plainText = idea.description.replace(/<[^>]*>/g, " ").trim();
    if (plainText) {
      parts.push(plainText);
    }
  }

  if (idea.category) {
    parts.push(idea.category);
  }

  if (idea.tags?.length) {
    parts.push(idea.tags.join(" "));
  }

  return parts.join(" ").slice(0, 8000); // Limit input length
}
