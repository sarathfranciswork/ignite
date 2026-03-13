import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    predictiveScore: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

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

describe("ai-scoring.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scoreIdea", () => {
    it("scores an idea with rule-based fallback when AI is not available", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { aiProvider } = await import("@/server/lib/ai/factory");
      const { scoreIdea } = await import("./ai-scoring.service");

      vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
      vi.mocked(prisma.idea.findUnique).mockResolvedValue({
        id: "idea-1",
        title: "Test Idea",
        description: "A detailed description of the test idea that is well elaborated.",
        tags: ["innovation", "automation"],
        likesCount: 5,
        commentsCount: 3,
        viewsCount: 10,
        campaign: { id: "camp-1", title: "Innovation Challenge", description: "Challenge desc" },
      } as never);

      const mockCreated = {
        id: "score-1",
        ideaId: "idea-1",
        overallScore: 55,
        feasibilityScore: 55,
        impactScore: 55,
        alignmentScore: 55,
        confidenceLevel: 0.3,
        reasoning: "Rule-based scoring",
        modelVersion: "v1.0-predictive",
        scoredAt: new Date("2026-01-01"),
      };
      vi.mocked(prisma.predictiveScore.create).mockResolvedValue(mockCreated as never);

      const result = await scoreIdea({ ideaId: "idea-1" }, "user-1");

      expect(result).toBeDefined();
      expect(result.ideaId).toBe("idea-1");
      expect(prisma.predictiveScore.create).toHaveBeenCalledOnce();
      expect(prisma.idea.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "idea-1" } }),
      );
    });

    it("throws IDEA_NOT_FOUND when idea does not exist", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { scoreIdea, AiScoringServiceError } = await import("./ai-scoring.service");

      vi.mocked(prisma.idea.findUnique).mockResolvedValue(null);

      await expect(scoreIdea({ ideaId: "nonexistent" }, "user-1")).rejects.toThrow(
        AiScoringServiceError,
      );
    });

    it("uses AI scoring when text generation is available", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { aiProvider } = await import("@/server/lib/ai/factory");
      const { scoreIdea } = await import("./ai-scoring.service");

      vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
      vi.mocked(aiProvider.generateText).mockResolvedValue({
        text: "feasibility: 75\nimpact: 80\nalignment: 70\nconfidence: 0.8\nreasoning: Strong idea with clear impact.",
        finishReason: "stop",
      });

      vi.mocked(prisma.idea.findUnique).mockResolvedValue({
        id: "idea-1",
        title: "AI-Powered Widget",
        description: "A smart widget using machine learning",
        tags: ["ai", "ml"],
        likesCount: 10,
        commentsCount: 5,
        viewsCount: 50,
        campaign: { id: "camp-1", title: "Tech Innovation", description: "Tech challenge" },
      } as never);

      const mockCreated = {
        id: "score-2",
        ideaId: "idea-1",
        overallScore: 75.5,
        feasibilityScore: 75,
        impactScore: 80,
        alignmentScore: 70,
        confidenceLevel: 0.8,
        reasoning: "Strong idea with clear impact.",
        modelVersion: "v1.0-predictive",
        scoredAt: new Date("2026-01-01"),
      };
      vi.mocked(prisma.predictiveScore.create).mockResolvedValue(mockCreated as never);

      const result = await scoreIdea({ ideaId: "idea-1" }, "user-1");

      expect(result).toBeDefined();
      expect(aiProvider.generateText).toHaveBeenCalledOnce();
    });

    it("falls back to rule-based when AI fails", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { aiProvider } = await import("@/server/lib/ai/factory");
      const { scoreIdea } = await import("./ai-scoring.service");

      vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
      vi.mocked(aiProvider.generateText).mockRejectedValue(new Error("API error"));

      vi.mocked(prisma.idea.findUnique).mockResolvedValue({
        id: "idea-1",
        title: "Fallback Idea",
        description: "Testing fallback behavior",
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
        campaign: { id: "camp-1", title: "Test Campaign", description: "" },
      } as never);

      const mockCreated = {
        id: "score-3",
        ideaId: "idea-1",
        overallScore: 40,
        feasibilityScore: 40,
        impactScore: 35,
        alignmentScore: 45,
        confidenceLevel: 0.3,
        reasoning: "Rule-based scoring",
        modelVersion: "v1.0-predictive",
        scoredAt: new Date("2026-01-01"),
      };
      vi.mocked(prisma.predictiveScore.create).mockResolvedValue(mockCreated as never);

      const result = await scoreIdea({ ideaId: "idea-1" }, "user-1");

      expect(result).toBeDefined();
      expect(result.confidenceLevel).toBe(0.3);
    });
  });

  describe("getIdeaScore", () => {
    it("returns latest score for an idea", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { getIdeaScore } = await import("./ai-scoring.service");

      vi.mocked(prisma.predictiveScore.findFirst).mockResolvedValue({
        id: "score-1",
        ideaId: "idea-1",
        overallScore: 72,
        feasibilityScore: 70,
        impactScore: 75,
        alignmentScore: 71,
        confidenceLevel: 0.8,
        reasoning: "Good score",
        modelVersion: "v1.0-predictive",
        scoredAt: new Date("2026-01-01"),
      } as never);

      const result = await getIdeaScore({ ideaId: "idea-1" });

      expect(result).toBeDefined();
      expect(result?.overallScore).toBe(72);
    });

    it("returns null when no score exists", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { getIdeaScore } = await import("./ai-scoring.service");

      vi.mocked(prisma.predictiveScore.findFirst).mockResolvedValue(null);

      const result = await getIdeaScore({ ideaId: "idea-1" });

      expect(result).toBeNull();
    });
  });

  describe("getScoreHistory", () => {
    it("returns paginated score history", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { getScoreHistory } = await import("./ai-scoring.service");

      vi.mocked(prisma.predictiveScore.findMany).mockResolvedValue([
        {
          id: "score-1",
          ideaId: "idea-1",
          overallScore: 72,
          feasibilityScore: 70,
          impactScore: 75,
          alignmentScore: 71,
          confidenceLevel: 0.8,
          reasoning: "Score 1",
          modelVersion: "v1.0",
          scoredAt: new Date("2026-01-01"),
        },
      ] as never);

      const result = await getScoreHistory({ ideaId: "idea-1", limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe("batchScoreIdeas", () => {
    it("throws CAMPAIGN_NOT_FOUND for invalid campaign", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { batchScoreIdeas, AiScoringServiceError } = await import("./ai-scoring.service");

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      await expect(batchScoreIdeas({ campaignId: "nonexistent" }, "user-1")).rejects.toThrow(
        AiScoringServiceError,
      );
    });
  });

  describe("getCampaignScoreDistribution", () => {
    it("returns empty distribution for campaign with no scores", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { getCampaignScoreDistribution } = await import("./ai-scoring.service");

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "camp-1" } as never);
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const result = await getCampaignScoreDistribution({ campaignId: "camp-1" });

      expect(result.totalScored).toBe(0);
      expect(result.averageScore).toBe(0);
    });

    it("throws CAMPAIGN_NOT_FOUND for invalid campaign", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { getCampaignScoreDistribution, AiScoringServiceError } =
        await import("./ai-scoring.service");

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      await expect(getCampaignScoreDistribution({ campaignId: "nonexistent" })).rejects.toThrow(
        AiScoringServiceError,
      );
    });
  });
});
