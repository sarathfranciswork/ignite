import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { EnrichIdeaInput, EnrichmentResult, CopilotEventInput } from "./enrichment.schemas";

const childLogger = logger.child({ service: "enrichment" });

const COMMON_INNOVATION_TAGS = [
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
];

/**
 * Enrich an idea with AI-powered or rule-based suggestions.
 *
 * Strategy:
 * 1. If AI provider supports text generation, use it for rich suggestions
 * 2. Always run rule-based analysis as a baseline/fallback
 * 3. Merge results, preferring AI when available
 */
export async function enrichIdea(input: EnrichIdeaInput): Promise<EnrichmentResult> {
  const ruleBasedResult = analyzeWithRules(input);

  if (aiProvider.supportsTextGeneration()) {
    try {
      const aiResult = await analyzeWithAI(input);
      if (aiResult) {
        return mergeResults(aiResult, ruleBasedResult);
      }
    } catch (error) {
      childLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "AI enrichment failed — using rule-based fallback",
      );
    }
  }

  return ruleBasedResult;
}

/**
 * Record a copilot suggestion event (accepted or dismissed).
 */
export function recordCopilotEvent(input: CopilotEventInput, userId: string): void {
  const eventName =
    input.action === "accepted"
      ? ("copilot.suggestionAccepted" as const)
      : ("copilot.suggestionDismissed" as const);

  eventBus.emit(eventName, {
    entity: "copilot",
    entityId: input.ideaId ?? "draft",
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      suggestionType: input.suggestionType,
      suggestionValue: input.suggestionValue,
    },
  });

  childLogger.debug(
    { userId, action: input.action, suggestionType: input.suggestionType },
    "Copilot event recorded",
  );
}

/**
 * Get the current enrichment capability status.
 */
export function getEnrichmentStatus(): {
  available: boolean;
  aiPowered: boolean;
  provider: string;
} {
  return {
    available: true,
    aiPowered: aiProvider.supportsTextGeneration(),
    provider: aiProvider.name,
  };
}

/**
 * Rule-based content analysis — always available, no AI dependency.
 */
function analyzeWithRules(input: EnrichIdeaInput): EnrichmentResult {
  const suggestedTags = suggestTagsFromContent(input);
  const suggestedCategory = suggestCategoryFromContent(input);
  const gaps = detectGaps(input);
  const descriptionHints = generateDescriptionHints(input);

  return {
    suggestedTags,
    suggestedCategory,
    descriptionHints,
    gaps,
    aiPowered: false,
  };
}

/**
 * AI-powered content analysis using text generation.
 */
async function analyzeWithAI(input: EnrichIdeaInput): Promise<EnrichmentResult | null> {
  const systemPrompt = `You are an innovation management assistant that helps improve idea submissions.
Analyze the idea and provide structured suggestions in valid JSON format.
Do not include markdown code fences — respond with raw JSON only.

Response format:
{
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "Category Name",
  "descriptionHints": ["suggestion for improving the description"],
  "gaps": ["missing information that would strengthen the idea"]
}

Rules:
- Suggest 3-5 relevant tags (lowercase, hyphenated)
- Suggest exactly 1 category from common innovation categories
- Provide 1-3 actionable description improvement suggestions
- Identify 1-3 gaps or missing information
- Keep all suggestions concise (under 100 characters each)
- Be constructive, not critical`;

  const content = buildContentSummary(input);
  const prompt = `Analyze this innovation idea and provide enrichment suggestions:\n\n${content}`;

  const result = await aiProvider.generateText(prompt, systemPrompt);
  if (!result || !result.text || result.finishReason === "error") {
    return null;
  }

  try {
    const parsed = JSON.parse(result.text) as {
      suggestedTags?: unknown;
      suggestedCategory?: unknown;
      descriptionHints?: unknown;
      gaps?: unknown;
    };

    return {
      suggestedTags: validateStringArray(parsed.suggestedTags, 10),
      suggestedCategory:
        typeof parsed.suggestedCategory === "string"
          ? parsed.suggestedCategory.slice(0, 200)
          : null,
      descriptionHints: validateStringArray(parsed.descriptionHints, 5),
      gaps: validateStringArray(parsed.gaps, 5),
      aiPowered: true,
    };
  } catch (error) {
    childLogger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to parse AI enrichment response",
    );
    return null;
  }
}

function validateStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .slice(0, maxItems)
    .map((s) => s.slice(0, 200));
}

function buildContentSummary(input: EnrichIdeaInput): string {
  const parts: string[] = [`Title: ${input.title}`];
  if (input.teaser) parts.push(`Teaser: ${input.teaser}`);
  if (input.description) parts.push(`Description: ${input.description.slice(0, 2000)}`);
  if (input.category) parts.push(`Category: ${input.category}`);
  if (input.tags && input.tags.length > 0) parts.push(`Tags: ${input.tags.join(", ")}`);
  return parts.join("\n");
}

/**
 * Merge AI results with rule-based results.
 * AI results take priority, rule-based fills gaps.
 */
function mergeResults(aiResult: EnrichmentResult, ruleResult: EnrichmentResult): EnrichmentResult {
  const allTags = [...new Set([...aiResult.suggestedTags, ...ruleResult.suggestedTags])];

  return {
    suggestedTags: allTags.slice(0, 8),
    suggestedCategory: aiResult.suggestedCategory ?? ruleResult.suggestedCategory,
    descriptionHints:
      aiResult.descriptionHints.length > 0
        ? aiResult.descriptionHints
        : ruleResult.descriptionHints,
    gaps: aiResult.gaps.length > 0 ? aiResult.gaps : ruleResult.gaps,
    aiPowered: true,
  };
}

/**
 * Extract potential tags from title, teaser, and description content.
 */
function suggestTagsFromContent(input: EnrichIdeaInput): string[] {
  const existingTags = new Set((input.tags ?? []).map((t) => t.toLowerCase()));
  const text = [input.title, input.teaser, input.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const suggestions: string[] = [];

  for (const tag of COMMON_INNOVATION_TAGS) {
    if (existingTags.has(tag)) continue;

    const keywords = tag.split("-");
    const matches = keywords.some((kw) => text.includes(kw));
    if (matches) {
      suggestions.push(tag);
    }
  }

  return suggestions.slice(0, 5);
}

/**
 * Suggest a category based on content keywords.
 */
function suggestCategoryFromContent(input: EnrichIdeaInput): string | null {
  if (input.category) return null;

  const text = [input.title, input.teaser, input.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    "Product Innovation": ["product", "feature", "new offering", "launch"],
    "Process Improvement": ["process", "workflow", "streamline", "optimize"],
    "Cost Reduction": ["cost", "save", "reduce", "budget", "expense"],
    "Customer Experience": ["customer", "user experience", "satisfaction", "feedback"],
    Sustainability: ["sustain", "green", "environment", "carbon", "eco"],
    "Digital Transformation": ["digital", "transform", "cloud", "platform"],
    "Employee Engagement": ["employee", "team", "culture", "morale", "talent"],
    "Market Expansion": ["market", "expand", "growth", "new region"],
    "Technology Adoption": ["technology", "adopt", "implement", "tool"],
    "Operational Excellence": ["operation", "excellence", "quality", "lean"],
  };

  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : null;
}

/**
 * Detect missing information that would strengthen the idea.
 */
function detectGaps(input: EnrichIdeaInput): string[] {
  const gaps: string[] = [];

  if (!input.description || input.description.length < 50) {
    gaps.push("Add a detailed description to explain your idea fully");
  }

  if (!input.teaser) {
    gaps.push("Add a teaser to provide a quick summary visible on idea cards");
  }

  if (!input.tags || input.tags.length === 0) {
    gaps.push("Add tags to help others discover your idea");
  }

  if (!input.category) {
    gaps.push("Specify a category to organize your idea");
  }

  const text = (input.description ?? "").toLowerCase();

  if (!text.includes("impact") && !text.includes("benefit") && !text.includes("value")) {
    gaps.push("Consider describing the expected impact or benefits");
  }

  if (!text.includes("implement") && !text.includes("step") && !text.includes("plan")) {
    gaps.push("Consider outlining implementation steps or a rough plan");
  }

  return gaps.slice(0, 4);
}

/**
 * Generate description improvement hints based on content analysis.
 */
function generateDescriptionHints(input: EnrichIdeaInput): string[] {
  const hints: string[] = [];
  const desc = input.description ?? "";

  if (desc.length > 0 && desc.length < 100) {
    hints.push("Your description is quite short — consider expanding with more details");
  }

  if (desc.length > 0 && !desc.includes("?") && desc.length > 200) {
    hints.push("Consider addressing potential questions stakeholders might have");
  }

  if (desc.length > 2000) {
    hints.push("Your description is quite long — consider adding a clear summary at the top");
  }

  const sentences = desc.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 0) {
    const avgLength = desc.length / sentences.length;
    if (avgLength > 200) {
      hints.push("Consider breaking long paragraphs into shorter, focused sections");
    }
  }

  return hints.slice(0, 3);
}
