import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichIdea, getEnrichmentStatus } from "./enrichment.service";

vi.mock("@/server/lib/ai/factory", () => ({
  aiProvider: {
    name: "test",
    isAvailable: vi.fn().mockReturnValue(false),
    supportsTextGeneration: vi.fn().mockReturnValue(false),
    generateText: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe("getEnrichmentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns available true and aiPowered false when AI text generation unavailable", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const status = getEnrichmentStatus();

    expect(status).toEqual({
      available: true,
      aiPowered: false,
      provider: "test",
    });
  });

  it("returns aiPowered true when AI text generation is available", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);

    const status = getEnrichmentStatus();

    expect(status).toEqual({
      available: true,
      aiPowered: true,
      provider: "test",
    });
  });
});

describe("enrichIdea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns local suggestions when AI text generation is unavailable", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
    vi.mocked(aiProvider.isAvailable).mockReturnValue(false);

    const result = await enrichIdea({
      title: "My Idea",
      description: undefined,
      tags: undefined,
    });

    expect(result.suggestions.length).toBeGreaterThan(0);
    // Should suggest adding description and tags
    const types = result.suggestions.map((s) => s.type);
    expect(types).toContain("description");
    expect(types).toContain("tags");
  });

  it("suggests adding teaser when missing", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
    vi.mocked(aiProvider.isAvailable).mockReturnValue(false);

    const result = await enrichIdea({
      title: "My Test Idea for Innovation",
      description: "This is a longer description that has enough content to pass the threshold.",
      tags: ["innovation"],
    });

    const types = result.suggestions.map((s) => s.type);
    expect(types).toContain("missing_info"); // missing teaser
  });

  it("suggests more descriptive title when title is short", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
    vi.mocked(aiProvider.isAvailable).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Idea",
    });

    const titleSuggestion = result.suggestions.find((s) => s.type === "title");
    expect(titleSuggestion).toBeDefined();
    expect(titleSuggestion?.label).toContain("descriptive title");
  });

  it("suggests problem statement when description lacks it", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
    vi.mocked(aiProvider.isAvailable).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Smart Energy Monitoring",
      teaser: "Monitors energy",
      description:
        "A system that provides real-time dashboards with advanced analytics and reporting for energy data.",
      tags: ["energy", "analytics"],
      category: "Green Tech",
    });

    const missingInfoSuggestions = result.suggestions.filter((s) => s.type === "missing_info");
    const labels = missingInfoSuggestions.map((s) => s.label);
    expect(labels.some((l) => l.includes("problem") || l.includes("impact"))).toBe(true);
  });

  it("uses AI text generation when available and parses response", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);

    const aiResponse = JSON.stringify([
      {
        type: "description",
        label: "Expand your description",
        suggestion: "Consider adding more details about the implementation approach.",
      },
      {
        type: "tags",
        label: "Suggested tags",
        suggestion: "Consider adding: machine-learning, automation, cost-savings",
      },
    ]);

    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: aiResponse,
      success: true,
    });

    const result = await enrichIdea({
      title: "AI-Powered Process Optimization",
      description: "Using machine learning to optimize workflows.",
    });

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].type).toBe("description");
    expect(result.suggestions[1].type).toBe("tags");
    expect(result.available).toBe(true);
  });

  it("handles AI response with markdown code fences", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);

    const aiResponse =
      '```json\n[{"type":"title","label":"Improve title","suggestion":"Make it more specific."}]\n```';

    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: aiResponse,
      success: true,
    });

    const result = await enrichIdea({
      title: "Idea",
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].type).toBe("title");
  });

  it("falls back to local suggestions when AI generation fails", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);

    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: "",
      success: false,
    });

    const result = await enrichIdea({
      title: "My Idea",
    });

    // Should still get local suggestions
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("falls back to local when AI returns invalid JSON", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);

    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: "This is not valid JSON",
      success: true,
    });

    const result = await enrichIdea({
      title: "My Idea",
    });

    // Should still get local suggestions since AI parsing failed
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("limits suggestions to 5 maximum", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);

    const manySuggestions = Array.from({ length: 10 }, (_, i) => ({
      type: "missing_info",
      label: `Suggestion ${i}`,
      suggestion: `Detail ${i}`,
    }));

    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: JSON.stringify(manySuggestions),
      success: true,
    });

    const result = await enrichIdea({
      title: "Test Idea",
    });

    expect(result.suggestions.length).toBeLessThanOrEqual(5);
  });

  it("filters out invalid suggestion types from AI response", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);

    const mixedResponse = JSON.stringify([
      { type: "description", label: "Valid", suggestion: "A valid suggestion." },
      { type: "invalid_type", label: "Invalid", suggestion: "Should be filtered." },
      { type: "tags", label: "Also valid", suggestion: "Another valid suggestion." },
    ]);

    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: mixedResponse,
      success: true,
    });

    const result = await enrichIdea({
      title: "Test Idea",
    });

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions.every((s) => ["description", "tags"].includes(s.type))).toBe(true);
  });

  it("returns no local suggestions for a well-formed idea", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
    vi.mocked(aiProvider.isAvailable).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Comprehensive Smart Energy Monitoring System",
      teaser: "Real-time energy monitoring to solve the problem of waste.",
      description:
        "This addresses the challenge of energy waste in large buildings. The problem is that building managers lack visibility. The expected impact is a 30% reduction in energy costs, resulting in significant benefit to both the environment and the bottom line.",
      tags: ["energy", "iot", "sustainability"],
      category: "Green Tech",
    });

    expect(result.suggestions).toHaveLength(0);
  });
});
