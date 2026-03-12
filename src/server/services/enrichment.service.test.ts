import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichIdea, getEnrichmentStatus, recordCopilotEvent } from "./enrichment.service";

vi.mock("@/server/lib/ai/factory", () => ({
  aiProvider: {
    name: "test",
    isAvailable: vi.fn().mockReturnValue(false),
    supportsTextGeneration: vi.fn().mockReturnValue(false),
    generateText: vi.fn(),
    generateEmbedding: vi.fn(),
    findSimilar: vi.fn(),
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

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

describe("getEnrichmentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns available true with aiPowered false when no text generation", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const status = getEnrichmentStatus();

    expect(status).toEqual({
      available: true,
      aiPowered: false,
      provider: "test",
    });
  });

  it("returns aiPowered true when text generation is available", async () => {
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

  it("returns rule-based suggestions for a minimal idea", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Smart energy monitoring system",
    });

    expect(result.aiPowered).toBe(false);
    expect(result.gaps).toContain("Add a detailed description to explain your idea fully");
    expect(result.gaps).toContain("Add a teaser to provide a quick summary visible on idea cards");
    expect(result.gaps).toContain("Add tags to help others discover your idea");
    expect(result.gaps).toContain("Specify a category to organize your idea");
  });

  it("suggests tags from content keywords", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Automation of customer processes",
      description:
        "This idea focuses on using digital tools to automate customer-facing processes and reduce costs through efficiency gains.",
    });

    expect(result.suggestedTags).toContain("automation");
    expect(result.suggestedTags).toContain("cost-reduction");
    expect(result.suggestedTags).toContain("efficiency");
    expect(result.suggestedTags).toContain("customer-experience");
    expect(result.aiPowered).toBe(false);
  });

  it("does not suggest tags already present", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Automation of processes",
      description: "Automate processes for efficiency",
      tags: ["automation", "efficiency"],
    });

    expect(result.suggestedTags).not.toContain("automation");
    expect(result.suggestedTags).not.toContain("efficiency");
  });

  it("suggests a category when none provided", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Green energy initiative for sustainability",
      description:
        "Implement eco-friendly practices to reduce carbon footprint across our operations.",
    });

    expect(result.suggestedCategory).toBe("Sustainability");
  });

  it("does not suggest category when already set", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Green energy initiative",
      category: "Sustainability",
    });

    expect(result.suggestedCategory).toBeNull();
  });

  it("detects missing impact/benefit in description", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const result = await enrichIdea({
      title: "New tool for tracking",
      description:
        "We should create a new tool that tracks usage across all departments and provides detailed reports on activity.",
      teaser: "A tracking tool",
      tags: ["tracking"],
      category: "Technology",
    });

    expect(result.gaps).toContain("Consider describing the expected impact or benefits");
  });

  it("generates description hints for short descriptions", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const result = await enrichIdea({
      title: "Quick idea",
      description: "A short description.",
      teaser: "Quick",
      tags: ["test"],
      category: "Test",
    });

    expect(result.descriptionHints).toContain(
      "Your description is quite short — consider expanding with more details",
    );
  });

  it("uses AI when text generation is available", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: JSON.stringify({
        suggestedTags: ["ai-powered", "machine-learning"],
        suggestedCategory: "Technology Adoption",
        descriptionHints: ["Add specific metrics for expected outcomes"],
        gaps: ["Consider mentioning the target user group"],
      }),
      finishReason: "stop",
    });

    const result = await enrichIdea({
      title: "AI-powered recommendation engine",
      description: "Build a recommendation system using machine learning",
    });

    expect(result.aiPowered).toBe(true);
    expect(result.suggestedTags).toContain("ai-powered");
    expect(result.suggestedTags).toContain("machine-learning");
    expect(result.suggestedCategory).toBe("Technology Adoption");
    expect(result.descriptionHints).toContain("Add specific metrics for expected outcomes");
    expect(result.gaps).toContain("Consider mentioning the target user group");
  });

  it("falls back to rule-based when AI returns error", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: "",
      finishReason: "error",
    });

    const result = await enrichIdea({
      title: "Automation of processes",
      description: "Automate everything for efficiency",
    });

    expect(result.aiPowered).toBe(false);
    expect(result.suggestedTags.length).toBeGreaterThanOrEqual(0);
  });

  it("falls back to rule-based when AI returns invalid JSON", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: "This is not valid JSON",
      finishReason: "stop",
    });

    const result = await enrichIdea({
      title: "Automation of processes",
    });

    expect(result.aiPowered).toBe(false);
  });

  it("merges AI and rule-based tags without duplicates", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: JSON.stringify({
        suggestedTags: ["automation", "smart-factory"],
        suggestedCategory: "Digital Transformation",
        descriptionHints: [],
        gaps: [],
      }),
      finishReason: "stop",
    });

    const result = await enrichIdea({
      title: "Automation and digitalization initiative",
      description: "Use automation to digitalize factory operations",
    });

    expect(result.aiPowered).toBe(true);
    const tagSet = new Set(result.suggestedTags);
    expect(tagSet.size).toBe(result.suggestedTags.length);
  });
});

describe("recordCopilotEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits suggestionAccepted event", async () => {
    const { eventBus } = await import("@/server/events/event-bus");

    recordCopilotEvent(
      {
        ideaId: "idea-1",
        suggestionType: "tag",
        suggestionValue: "automation",
        action: "accepted",
      },
      "user-1",
    );

    expect(eventBus.emit).toHaveBeenCalledWith(
      "copilot.suggestionAccepted",
      expect.objectContaining({
        entity: "copilot",
        entityId: "idea-1",
        actor: "user-1",
        metadata: {
          suggestionType: "tag",
          suggestionValue: "automation",
        },
      }),
    );
  });

  it("emits suggestionDismissed event", async () => {
    const { eventBus } = await import("@/server/events/event-bus");

    recordCopilotEvent(
      {
        suggestionType: "category",
        suggestionValue: "Innovation",
        action: "dismissed",
      },
      "user-2",
    );

    expect(eventBus.emit).toHaveBeenCalledWith(
      "copilot.suggestionDismissed",
      expect.objectContaining({
        entity: "copilot",
        entityId: "draft",
        actor: "user-2",
      }),
    );
  });
});
