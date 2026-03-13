import { prisma } from "@/server/lib/prisma";
import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  CategorizeIdeaInput,
  BatchCategorizeInput,
  GetSuggestedTagsInput,
  AcceptTagInput,
  RejectTagInput,
  AutoTagResponse,
} from "./ai-categorization.schemas";

const childLogger = logger.child({ service: "ai-categorization" });

export class AiCategorizationServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AiCategorizationServiceError";
  }
}

function mapAutoTagToResponse(tag: {
  id: string;
  ideaId: string;
  tag: string;
  confidence: number;
  source: string;
  isAccepted: boolean | null;
  createdAt: Date;
}): AutoTagResponse {
  return {
    id: tag.id,
    ideaId: tag.ideaId,
    tag: tag.tag,
    confidence: tag.confidence,
    source: tag.source,
    isAccepted: tag.isAccepted,
    createdAt: tag.createdAt.toISOString(),
  };
}

const COMMON_CATEGORIES = [
  "sustainability",
  "digitalization",
  "automation",
  "cost-reduction",
  "customer-experience",
  "efficiency",
  "collaboration",
  "data-driven",
  "process-improvement",
  "emerging-technology",
  "green-energy",
  "supply-chain",
  "employee-engagement",
  "scalability",
  "compliance",
  "ai-ml",
  "iot",
  "cloud",
  "security",
  "innovation",
];

interface ExtractedTag {
  tag: string;
  confidence: number;
}

function extractTagsWithRules(title: string, description: string): ExtractedTag[] {
  const text = `${title} ${description}`.toLowerCase();
  const matched: ExtractedTag[] = [];

  for (const category of COMMON_CATEGORIES) {
    const keywords = category.split("-");
    const matchCount = keywords.filter((kw) => text.includes(kw)).length;
    if (matchCount > 0) {
      matched.push({
        tag: category,
        confidence: Math.min(0.9, 0.3 + matchCount * 0.2),
      });
    }
  }

  return matched.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function parseAiTags(text: string): ExtractedTag[] {
  const tags: ExtractedTag[] = [];
  const lines = text.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const match = line.match(/(?:[-*]\s*)?([^:,]+?)(?:\s*[:]\s*(\d+(?:\.\d+)?))?(?:\s*$|,)/);
    if (match) {
      const tag = match[1].trim().toLowerCase().replace(/\s+/g, "-");
      const confidence = match[2]
        ? Math.min(1, parseFloat(match[2]) > 1 ? parseFloat(match[2]) / 100 : parseFloat(match[2]))
        : 0.7;
      if (tag.length > 1 && tag.length < 50) {
        tags.push({ tag, confidence });
      }
    }
  }

  return tags.slice(0, 10);
}

export async function categorizeIdea(
  input: CategorizeIdeaInput,
  actorId: string,
): Promise<AutoTagResponse[]> {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      campaign: { select: { title: true, description: true } },
    },
  });

  if (!idea) {
    throw new AiCategorizationServiceError("IDEA_NOT_FOUND", "Idea not found");
  }

  let extractedTags: ExtractedTag[];
  let source: "AI_CATEGORIZATION" | "AI_EXTRACTION" = "AI_EXTRACTION";

  if (aiProvider.supportsTextGeneration()) {
    try {
      const prompt = buildCategorizationPrompt(
        idea.title,
        idea.description ?? "",
        idea.campaign.title,
      );
      const result = await aiProvider.generateText(prompt, CATEGORIZATION_SYSTEM_PROMPT);
      if (result) {
        extractedTags = parseAiTags(result.text);
        source = "AI_CATEGORIZATION";
      } else {
        extractedTags = extractTagsWithRules(idea.title, idea.description ?? "");
      }
    } catch (error) {
      childLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "AI categorization failed — using rule-based fallback",
      );
      extractedTags = extractTagsWithRules(idea.title, idea.description ?? "");
    }
  } else {
    extractedTags = extractTagsWithRules(idea.title, idea.description ?? "");
  }

  const existingTags = new Set(idea.tags.map((t) => t.toLowerCase()));
  const newTags = extractedTags.filter((t) => !existingTags.has(t.tag));

  if (newTags.length === 0) {
    return [];
  }

  const created = await prisma.$transaction(
    newTags.map((t) =>
      prisma.autoTag.create({
        data: {
          ideaId: input.ideaId,
          tag: t.tag,
          confidence: t.confidence,
          source,
        },
      }),
    ),
  );

  eventBus.emit("ai.ideaCategorized", {
    entity: "idea",
    entityId: input.ideaId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { tagCount: created.length, source },
  });

  childLogger.info({ ideaId: input.ideaId, tagCount: created.length }, "Idea categorized");

  return created.map(mapAutoTagToResponse);
}

export async function batchCategorize(
  input: BatchCategorizeInput,
  actorId: string,
): Promise<{ categorized: number; errors: number }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
  });

  if (!campaign) {
    throw new AiCategorizationServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const uncategorizedIdeas = await prisma.idea.findMany({
    where: {
      campaignId: input.campaignId,
      autoTags: { none: {} },
    },
    select: { id: true },
    take: 100,
  });

  let categorized = 0;
  let errors = 0;

  for (const idea of uncategorizedIdeas) {
    try {
      await categorizeIdea({ ideaId: idea.id }, actorId);
      categorized++;
    } catch (error) {
      childLogger.warn(
        { ideaId: idea.id, error: error instanceof Error ? error.message : String(error) },
        "Failed to categorize idea in batch",
      );
      errors++;
    }
  }

  childLogger.info(
    { campaignId: input.campaignId, categorized, errors },
    "Batch categorization completed",
  );

  return { categorized, errors };
}

export async function getSuggestedTags(input: GetSuggestedTagsInput): Promise<AutoTagResponse[]> {
  const tags = await prisma.autoTag.findMany({
    where: { ideaId: input.ideaId },
    orderBy: { confidence: "desc" },
  });

  return tags.map(mapAutoTagToResponse);
}

export async function acceptTag(input: AcceptTagInput, actorId: string): Promise<AutoTagResponse> {
  const autoTag = await prisma.autoTag.findUnique({
    where: { id: input.autoTagId },
  });

  if (!autoTag) {
    throw new AiCategorizationServiceError("TAG_NOT_FOUND", "Auto tag not found");
  }

  const [updatedTag] = await prisma.$transaction([
    prisma.autoTag.update({
      where: { id: input.autoTagId },
      data: { isAccepted: true },
    }),
    prisma.idea.update({
      where: { id: autoTag.ideaId },
      data: {
        tags: { push: autoTag.tag },
      },
    }),
  ]);

  eventBus.emit("ai.tagAccepted", {
    entity: "autoTag",
    entityId: input.autoTagId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: autoTag.ideaId, tag: autoTag.tag },
  });

  return mapAutoTagToResponse(updatedTag);
}

export async function rejectTag(input: RejectTagInput, actorId: string): Promise<AutoTagResponse> {
  const autoTag = await prisma.autoTag.findUnique({
    where: { id: input.autoTagId },
  });

  if (!autoTag) {
    throw new AiCategorizationServiceError("TAG_NOT_FOUND", "Auto tag not found");
  }

  const updatedTag = await prisma.autoTag.update({
    where: { id: input.autoTagId },
    data: { isAccepted: false },
  });

  eventBus.emit("ai.tagRejected", {
    entity: "autoTag",
    entityId: input.autoTagId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: autoTag.ideaId, tag: autoTag.tag },
  });

  return mapAutoTagToResponse(updatedTag);
}

const CATEGORIZATION_SYSTEM_PROMPT = `You are a tag extraction engine for innovation ideas.
Extract relevant category tags from the idea content.
Return each tag on a new line in format: tag-name: confidence
Where confidence is 0-1 indicating how relevant the tag is.
Return 3-8 tags. Use lowercase hyphenated tags.`;

function buildCategorizationPrompt(
  ideaTitle: string,
  ideaDescription: string,
  campaignTitle: string,
): string {
  return `Extract category tags from this innovation idea:

Campaign: ${campaignTitle}
Idea Title: ${ideaTitle}
Idea Description: ${ideaDescription}

Return tags with confidence scores.`;
}
