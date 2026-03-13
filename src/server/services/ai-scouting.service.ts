import { prisma } from "@/server/lib/prisma";
import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  GenerateRecommendationsInput,
  GetRecommendationsInput,
  DismissRecommendationInput,
  LinkRecommendationInput,
  ScoutingRecommendationResponse,
} from "./ai-scouting.schemas";

const childLogger = logger.child({ service: "ai-scouting" });

export class AiScoutingServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AiScoutingServiceError";
  }
}

function mapRecommendationToResponse(rec: {
  id: string;
  siaId: string;
  organizationId: string | null;
  title: string;
  description: string;
  relevanceScore: number;
  reasoning: string;
  source: string;
  isDismissed: boolean;
  createdAt: Date;
}): ScoutingRecommendationResponse {
  return {
    id: rec.id,
    siaId: rec.siaId,
    organizationId: rec.organizationId,
    title: rec.title,
    description: rec.description,
    relevanceScore: rec.relevanceScore,
    reasoning: rec.reasoning,
    source: rec.source,
    isDismissed: rec.isDismissed,
    createdAt: rec.createdAt.toISOString(),
  };
}

interface ParsedRecommendation {
  title: string;
  description: string;
  relevanceScore: number;
  reasoning: string;
}

function parseAiRecommendations(text: string): ParsedRecommendation[] {
  const recommendations: ParsedRecommendation[] = [];
  const sections = text.split(/(?:^|\n)(?:#{1,3}\s+|\d+[\.\)]\s+)/);

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < 20) continue;

    const lines = trimmed.split("\n").filter((l) => l.trim());
    const title = lines[0]?.replace(/[*#]/g, "").trim() ?? "";
    const description = lines.slice(1, 3).join(" ").trim();
    const relevanceMatch = trimmed.match(/relevance[:\s]*(\d+(?:\.\d+)?)/i);
    const relevanceRaw = relevanceMatch ? parseFloat(relevanceMatch[1]) : 0.5;
    const relevanceScore = relevanceRaw > 1 ? relevanceRaw / 100 : relevanceRaw;
    const reasoningMatch = trimmed.match(/(?:reason|why|rationale)[:\s]*(.*?)$/im);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : description.slice(0, 200);

    if (title.length > 2) {
      recommendations.push({
        title: title.slice(0, 200),
        description: description.slice(0, 1000) || title,
        relevanceScore: Math.max(0, Math.min(1, relevanceScore)),
        reasoning: reasoning.slice(0, 500) || "AI-generated recommendation based on SIA analysis.",
      });
    }
  }

  return recommendations.slice(0, 5);
}

function generateRuleBasedRecommendations(
  siaName: string,
  siaDescription: string,
  trendNames: string[],
): ParsedRecommendation[] {
  const recommendations: ParsedRecommendation[] = [];

  if (trendNames.length > 0) {
    recommendations.push({
      title: `Explore startups in ${trendNames[0]}`,
      description: `Based on the SIA "${siaName}" and its linked trend "${trendNames[0]}", consider scouting startups working in this area.`,
      relevanceScore: 0.6,
      reasoning: `Linked trend "${trendNames[0]}" indicates market activity in this space.`,
    });
  }

  recommendations.push({
    title: `Industry scan for ${siaName}`,
    description: `Conduct a broader industry scan for organizations aligned with "${siaName}". ${siaDescription.slice(0, 200)}`,
    relevanceScore: 0.4,
    reasoning: "General recommendation based on SIA focus area description.",
  });

  return recommendations;
}

export async function generateRecommendations(
  input: GenerateRecommendationsInput,
  actorId: string,
): Promise<ScoutingRecommendationResponse[]> {
  const sia = await prisma.strategicInnovationArea.findUnique({
    where: { id: input.siaId },
    include: {
      trends: {
        include: { trend: { select: { title: true, description: true, type: true } } },
      },
    },
  });

  if (!sia) {
    throw new AiScoutingServiceError("SIA_NOT_FOUND", "Strategic Innovation Area not found");
  }

  const trendNames = sia.trends.map((t) => t.trend.title);
  let parsedRecommendations: ParsedRecommendation[];

  if (aiProvider.supportsTextGeneration()) {
    try {
      const prompt = buildScoutingPrompt(
        sia.name,
        sia.description ?? "",
        sia.trends.map((t) => ({
          title: t.trend.title,
          description: t.trend.description ?? "",
          type: t.trend.type,
        })),
      );

      const result = await aiProvider.generateText(prompt, SCOUTING_SYSTEM_PROMPT);
      if (result) {
        parsedRecommendations = parseAiRecommendations(result.text);
        if (parsedRecommendations.length === 0) {
          parsedRecommendations = generateRuleBasedRecommendations(
            sia.name,
            sia.description ?? "",
            trendNames,
          );
        }
      } else {
        parsedRecommendations = generateRuleBasedRecommendations(
          sia.name,
          sia.description ?? "",
          trendNames,
        );
      }
    } catch (error) {
      childLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "AI scouting failed — using rule-based fallback",
      );
      parsedRecommendations = generateRuleBasedRecommendations(
        sia.name,
        sia.description ?? "",
        trendNames,
      );
    }
  } else {
    parsedRecommendations = generateRuleBasedRecommendations(
      sia.name,
      sia.description ?? "",
      trendNames,
    );
  }

  const source = aiProvider.supportsTextGeneration() ? "ai-scouting" : "rule-based";

  const created = await prisma.$transaction(
    parsedRecommendations.map((rec) =>
      prisma.scoutingRecommendation.create({
        data: {
          siaId: input.siaId,
          title: rec.title,
          description: rec.description,
          relevanceScore: rec.relevanceScore,
          reasoning: rec.reasoning,
          source,
        },
      }),
    ),
  );

  eventBus.emit("ai.recommendationGenerated", {
    entity: "scoutingRecommendation",
    entityId: input.siaId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { count: created.length, source },
  });

  childLogger.info(
    { siaId: input.siaId, count: created.length },
    "Scouting recommendations generated",
  );

  return created.map(mapRecommendationToResponse);
}

export async function getRecommendations(
  input: GetRecommendationsInput,
): Promise<{ items: ScoutingRecommendationResponse[]; nextCursor?: string }> {
  const take = input.limit + 1;

  const where = {
    siaId: input.siaId,
    isDismissed: false,
    ...(input.minRelevance !== undefined ? { relevanceScore: { gte: input.minRelevance } } : {}),
  };

  const recommendations = await prisma.scoutingRecommendation.findMany({
    where,
    orderBy: { relevanceScore: "desc" },
    take,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | undefined;
  if (recommendations.length > input.limit) {
    const nextItem = recommendations.pop();
    nextCursor = nextItem?.id;
  }

  return {
    items: recommendations.map(mapRecommendationToResponse),
    nextCursor,
  };
}

export async function dismissRecommendation(
  input: DismissRecommendationInput,
  actorId: string,
): Promise<ScoutingRecommendationResponse> {
  const recommendation = await prisma.scoutingRecommendation.findUnique({
    where: { id: input.id },
  });

  if (!recommendation) {
    throw new AiScoutingServiceError("RECOMMENDATION_NOT_FOUND", "Recommendation not found");
  }

  const updated = await prisma.scoutingRecommendation.update({
    where: { id: input.id },
    data: { isDismissed: true },
  });

  eventBus.emit("ai.recommendationDismissed", {
    entity: "scoutingRecommendation",
    entityId: input.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { siaId: recommendation.siaId },
  });

  return mapRecommendationToResponse(updated);
}

export async function linkRecommendation(
  input: LinkRecommendationInput,
  actorId: string,
): Promise<ScoutingRecommendationResponse> {
  const recommendation = await prisma.scoutingRecommendation.findUnique({
    where: { id: input.id },
  });

  if (!recommendation) {
    throw new AiScoutingServiceError("RECOMMENDATION_NOT_FOUND", "Recommendation not found");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });

  if (!organization) {
    throw new AiScoutingServiceError("ORGANIZATION_NOT_FOUND", "Organization not found");
  }

  const updated = await prisma.scoutingRecommendation.update({
    where: { id: input.id },
    data: { organizationId: input.organizationId },
  });

  eventBus.emit("ai.recommendationLinked", {
    entity: "scoutingRecommendation",
    entityId: input.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { siaId: recommendation.siaId, organizationId: input.organizationId },
  });

  return mapRecommendationToResponse(updated);
}

const SCOUTING_SYSTEM_PROMPT = `You are an innovation scouting advisor. Based on Strategic Innovation Areas (SIAs) and their associated trends, generate recommendations for startups, organizations, or technologies to scout.

For each recommendation, provide:
1. Title (company/technology name or scouting direction)
2. Description (2-3 sentences about what to look for)
3. Relevance: <0-1 score>
4. Reason: <why this is relevant>

Generate 3-5 recommendations.`;

function buildScoutingPrompt(
  siaName: string,
  siaDescription: string,
  trends: { title: string; description: string; type: string }[],
): string {
  const trendSection = trends.map((t) => `- ${t.title} (${t.type}): ${t.description}`).join("\n");

  return `Generate scouting recommendations for this Strategic Innovation Area:

SIA: ${siaName}
Description: ${siaDescription}

Associated Trends:
${trendSection || "No trends linked yet."}

Suggest startups, organizations, or technologies to scout that align with this SIA.`;
}
