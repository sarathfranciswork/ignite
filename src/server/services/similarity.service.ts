import { prisma } from "@/server/lib/prisma";
import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";
import type { FindSimilarIdeasInput } from "./similarity.schemas";

const childLogger = logger.child({ service: "similarity" });

export interface SimilarIdeaResult {
  id: string;
  title: string;
  teaser: string | null;
  status: string;
  score: number;
  campaignId: string;
  campaignTitle: string;
  contributor: {
    id: string;
    name: string | null;
  };
}

/**
 * Find ideas similar to a given idea.
 *
 * Strategy:
 * 1. If AI is available and the idea has an embedding, use pgvector cosine similarity
 * 2. Otherwise, fall back to tsvector full-text search based on title + tags
 */
export async function findSimilarIdeas(input: FindSimilarIdeasInput): Promise<SimilarIdeaResult[]> {
  const { ideaId, limit } = input;

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      title: true,
      teaser: true,
      description: true,
      tags: true,
      category: true,
      campaignId: true,
    },
  });

  if (!idea) {
    childLogger.warn({ ideaId }, "Idea not found for similarity search");
    return [];
  }

  // Try vector similarity first
  if (aiProvider.isAvailable()) {
    const vectorResults = await findSimilarByVector(idea.id, limit);
    if (vectorResults.length > 0) {
      childLogger.debug(
        { ideaId, resultCount: vectorResults.length, method: "vector" },
        "Similar ideas found via vector search",
      );
      return vectorResults;
    }
  }

  // Fallback: tsvector full-text search
  const textResults = await findSimilarByText(idea, limit);
  childLogger.debug(
    { ideaId, resultCount: textResults.length, method: "text" },
    "Similar ideas found via text search",
  );
  return textResults;
}

/**
 * Find similar ideas using pgvector cosine distance.
 * Requires the source idea to have an embedding stored.
 */
async function findSimilarByVector(ideaId: string, limit: number): Promise<SimilarIdeaResult[]> {
  try {
    // Use a subquery to get the embedding of the source idea
    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        teaser: string | null;
        status: string;
        distance: number;
        campaign_id: string;
        campaign_title: string;
        contributor_id: string;
        contributor_name: string | null;
      }>
    >(
      `SELECT i.id, i.title, i.teaser, i.status,
              i.embedding <=> source.embedding AS distance,
              i.campaign_id, c.title AS campaign_title,
              u.id AS contributor_id, u.name AS contributor_name
       FROM ideas i
       JOIN ideas source ON source.id = $1
       JOIN campaigns c ON c.id = i.campaign_id
       JOIN users u ON u.id = i.contributor_id
       WHERE i.id != $1
         AND i.embedding IS NOT NULL
         AND source.embedding IS NOT NULL
       ORDER BY i.embedding <=> source.embedding
       LIMIT $2`,
      ideaId,
      limit,
    );

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      teaser: r.teaser,
      status: r.status,
      score: Math.round((1 - r.distance) * 100) / 100,
      campaignId: r.campaign_id,
      campaignTitle: r.campaign_title,
      contributor: {
        id: r.contributor_id,
        name: r.contributor_name,
      },
    }));
  } catch (error) {
    childLogger.error(
      { ideaId, error: error instanceof Error ? error.message : String(error) },
      "Vector similarity search failed — falling back to text",
    );
    return [];
  }
}

/**
 * Fallback: find similar ideas using text-based search.
 * Uses title words and tags to find related ideas via Prisma contains.
 */
async function findSimilarByText(
  idea: {
    id: string;
    title: string;
    teaser: string | null;
    tags: string[];
    category: string | null;
  },
  limit: number,
): Promise<SimilarIdeaResult[]> {
  // Extract significant words from title (skip short/common words)
  const titleWords = idea.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);

  const searchTerms = [...titleWords, ...idea.tags].filter(Boolean);

  if (searchTerms.length === 0) {
    return [];
  }

  // Build OR conditions for each search term
  const orConditions = searchTerms.map((term) => ({
    OR: [
      { title: { contains: term, mode: "insensitive" as const } },
      { teaser: { contains: term, mode: "insensitive" as const } },
      { tags: { hasSome: [term] } },
    ],
  }));

  const results = await prisma.idea.findMany({
    where: {
      id: { not: idea.id },
      OR: orConditions,
    },
    select: {
      id: true,
      title: true,
      teaser: true,
      status: true,
      campaignId: true,
      campaign: { select: { title: true } },
      contributor: { select: { id: true, name: true } },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return results.map((r, index) => ({
    id: r.id,
    title: r.title,
    teaser: r.teaser,
    status: r.status,
    // Text-based similarity gets a synthetic decreasing score
    score: Math.round((0.8 - index * 0.05) * 100) / 100,
    campaignId: r.campaignId,
    campaignTitle: r.campaign.title,
    contributor: {
      id: r.contributor.id,
      name: r.contributor.name,
    },
  }));
}

/**
 * Get AI provider status for the frontend.
 */
export function getAiStatus(): {
  available: boolean;
  provider: string;
} {
  return {
    available: aiProvider.isAvailable(),
    provider: aiProvider.name,
  };
}
