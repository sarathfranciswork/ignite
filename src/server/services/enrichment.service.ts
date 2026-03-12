import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";
import type { EnrichIdeaInput, EnrichmentResult, EnrichmentSuggestion } from "./enrichment.schemas";

const childLogger = logger.child({ service: "enrichment" });

const ENRICHMENT_SYSTEM_PROMPT = `You are an innovation platform assistant helping users improve their idea submissions.
Analyze the idea and provide actionable suggestions in JSON format.

Return a JSON array of suggestion objects. Each object has:
- "type": one of "description", "tags", "missing_info", "title"
- "label": a short label for the suggestion (max 60 chars)
- "suggestion": the actual suggestion text (1-3 sentences)

Rules:
- Only suggest improvements that are genuinely helpful
- If the description is missing or very short, suggest what to add
- If tags are missing, recommend 3-5 relevant tags
- If the title could be clearer, suggest an improvement
- Highlight any missing information (problem statement, target audience, expected impact, feasibility)
- Be concise and actionable
- Return between 1 and 5 suggestions
- Return ONLY the JSON array, no markdown formatting`;

function buildPrompt(input: EnrichIdeaInput): string {
  const parts = [`Title: ${input.title}`];

  if (input.teaser) {
    parts.push(`Teaser: ${input.teaser}`);
  }
  if (input.description) {
    parts.push(`Description: ${input.description}`);
  }
  if (input.category) {
    parts.push(`Category: ${input.category}`);
  }
  if (input.tags && input.tags.length > 0) {
    parts.push(`Tags: ${input.tags.join(", ")}`);
  }

  return parts.join("\n");
}

function parseAiResponse(text: string): EnrichmentSuggestion[] {
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed: unknown = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      childLogger.warn("AI response is not an array");
      return [];
    }

    const suggestions: EnrichmentSuggestion[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        "label" in item &&
        "suggestion" in item
      ) {
        const typedItem = item as { type: string; label: string; suggestion: string };
        const validTypes = ["description", "tags", "missing_info", "title"];
        if (
          validTypes.includes(typedItem.type) &&
          typeof typedItem.label === "string" &&
          typeof typedItem.suggestion === "string"
        ) {
          suggestions.push({
            type: typedItem.type as EnrichmentSuggestion["type"],
            label: typedItem.label.slice(0, 60),
            suggestion: typedItem.suggestion,
          });
        }
      }
    }

    return suggestions.slice(0, 5);
  } catch (error) {
    childLogger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to parse AI enrichment response",
    );
    return [];
  }
}

/**
 * Generate rule-based suggestions when AI text generation is unavailable.
 * Analyzes idea content locally and provides basic structural feedback.
 */
function generateLocalSuggestions(input: EnrichIdeaInput): EnrichmentSuggestion[] {
  const suggestions: EnrichmentSuggestion[] = [];

  if (!input.description || input.description.length < 50) {
    suggestions.push({
      type: "description",
      label: "Add a detailed description",
      suggestion:
        "Your idea would benefit from a more detailed description. Consider explaining the problem it solves, how it works, and what impact it could have.",
    });
  }

  if (!input.tags || input.tags.length === 0) {
    suggestions.push({
      type: "tags",
      label: "Add relevant tags",
      suggestion:
        "Adding tags helps others discover your idea. Consider adding 3-5 tags that describe the key themes, technologies, or domains.",
    });
  }

  if (!input.teaser) {
    suggestions.push({
      type: "missing_info",
      label: "Add a teaser summary",
      suggestion:
        "A short teaser (1-2 sentences) helps your idea stand out in lists and search results.",
    });
  }

  if (input.title.length < 10) {
    suggestions.push({
      type: "title",
      label: "Consider a more descriptive title",
      suggestion:
        "A more descriptive title helps others quickly understand what your idea is about. Try to be specific about the problem or solution.",
    });
  }

  if (input.description && input.description.length >= 50) {
    const hasImpact = /impact|benefit|result|outcome|value/i.test(input.description);
    const hasProblem = /problem|challenge|issue|pain point|opportunity/i.test(input.description);

    if (!hasProblem) {
      suggestions.push({
        type: "missing_info",
        label: "Describe the problem or opportunity",
        suggestion:
          "Consider adding a clear problem statement or opportunity description to help reviewers understand why this idea matters.",
      });
    }

    if (!hasImpact) {
      suggestions.push({
        type: "missing_info",
        label: "Describe expected impact",
        suggestion:
          "Adding information about expected benefits or impact helps evaluators assess your idea's potential value.",
      });
    }
  }

  if (!input.category) {
    suggestions.push({
      type: "missing_info",
      label: "Select a category",
      suggestion:
        "Assigning a category helps organize your idea and makes it easier for the right people to find and evaluate it.",
    });
  }

  return suggestions.slice(0, 5);
}

/**
 * Enrich an idea with AI-powered suggestions.
 *
 * Strategy:
 * 1. If AI text generation is available (OpenAI), use it for rich suggestions
 * 2. Otherwise, fall back to rule-based local suggestions
 */
export async function enrichIdea(input: EnrichIdeaInput): Promise<EnrichmentResult> {
  if (aiProvider.supportsTextGeneration()) {
    childLogger.info("Using AI text generation for enrichment");

    const prompt = buildPrompt(input);
    const result = await aiProvider.generateText(prompt, ENRICHMENT_SYSTEM_PROMPT);

    if (result.success && result.text) {
      const suggestions = parseAiResponse(result.text);
      if (suggestions.length > 0) {
        childLogger.debug(
          { suggestionCount: suggestions.length },
          "AI enrichment suggestions generated",
        );
        return { suggestions, available: true };
      }
    }

    childLogger.warn("AI text generation failed, falling back to local suggestions");
  }

  // Fallback: rule-based suggestions
  const suggestions = generateLocalSuggestions(input);
  childLogger.debug(
    { suggestionCount: suggestions.length, method: "local" },
    "Local enrichment suggestions generated",
  );
  return { suggestions, available: aiProvider.isAvailable() };
}

/**
 * Check if enrichment features are available.
 */
export function getEnrichmentStatus(): {
  available: boolean;
  aiPowered: boolean;
  provider: string;
} {
  return {
    available: true, // Rule-based suggestions are always available
    aiPowered: aiProvider.supportsTextGeneration(),
    provider: aiProvider.name,
  };
}
