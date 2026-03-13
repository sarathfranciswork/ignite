import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    strategicInnovationArea: {
      findUnique: vi.fn(),
    },
    scoutingRecommendation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
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

describe("ai-scouting.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateRecommendations", () => {
    it("generates rule-based recommendations when AI is not available", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { aiProvider } = await import("@/server/lib/ai/factory");
      const { eventBus } = await import("@/server/events/event-bus");
      const { generateRecommendations } = await import("./ai-scouting.service");

      vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue({
        id: "sia-1",
        name: "Digital Transformation",
        description: "Focus on digital transformation initiatives",
        trends: [
          {
            trend: { title: "AI Adoption", description: "Growing AI usage", type: "MACRO" },
          },
        ],
      } as never);

      const mockRecs = [
        {
          id: "rec-1",
          siaId: "sia-1",
          organizationId: null,
          title: "Explore startups in AI Adoption",
          description: "Based on the SIA...",
          relevanceScore: 0.6,
          reasoning: "Linked trend indicates activity",
          source: "rule-based",
          isDismissed: false,
          createdAt: new Date("2026-01-01"),
        },
        {
          id: "rec-2",
          siaId: "sia-1",
          organizationId: null,
          title: "Industry scan for Digital Transformation",
          description: "Conduct a broader scan",
          relevanceScore: 0.4,
          reasoning: "General recommendation",
          source: "rule-based",
          isDismissed: false,
          createdAt: new Date("2026-01-01"),
        },
      ];
      vi.mocked(prisma.$transaction).mockResolvedValue(mockRecs);

      const result = await generateRecommendations({ siaId: "sia-1" }, "user-1");

      expect(result).toHaveLength(2);
      expect(result[0].siaId).toBe("sia-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "ai.recommendationGenerated",
        expect.objectContaining({ entityId: "sia-1" }),
      );
    });

    it("throws SIA_NOT_FOUND when SIA does not exist", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { generateRecommendations, AiScoutingServiceError } =
        await import("./ai-scouting.service");

      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue(null);

      await expect(generateRecommendations({ siaId: "nonexistent" }, "user-1")).rejects.toThrow(
        AiScoutingServiceError,
      );
    });
  });

  describe("getRecommendations", () => {
    it("returns paginated recommendations", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { getRecommendations } = await import("./ai-scouting.service");

      vi.mocked(prisma.scoutingRecommendation.findMany).mockResolvedValue([
        {
          id: "rec-1",
          siaId: "sia-1",
          organizationId: null,
          title: "Test Recommendation",
          description: "A test rec",
          relevanceScore: 0.7,
          reasoning: "Test reasoning",
          source: "rule-based",
          isDismissed: false,
          createdAt: new Date("2026-01-01"),
        },
      ]);

      const result = await getRecommendations({ siaId: "sia-1", limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });

    it("applies minRelevance filter", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { getRecommendations } = await import("./ai-scouting.service");

      vi.mocked(prisma.scoutingRecommendation.findMany).mockResolvedValue([]);

      await getRecommendations({ siaId: "sia-1", minRelevance: 0.5, limit: 20 });

      expect(prisma.scoutingRecommendation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relevanceScore: { gte: 0.5 },
          }),
        }),
      );
    });
  });

  describe("dismissRecommendation", () => {
    it("dismisses a recommendation", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { eventBus } = await import("@/server/events/event-bus");
      const { dismissRecommendation } = await import("./ai-scouting.service");

      vi.mocked(prisma.scoutingRecommendation.findUnique).mockResolvedValue({
        id: "rec-1",
        siaId: "sia-1",
      } as never);

      vi.mocked(prisma.scoutingRecommendation.update).mockResolvedValue({
        id: "rec-1",
        siaId: "sia-1",
        organizationId: null,
        title: "Dismissed Rec",
        description: "Test",
        relevanceScore: 0.5,
        reasoning: "Test",
        source: "rule-based",
        isDismissed: true,
        createdAt: new Date("2026-01-01"),
      } as never);

      const result = await dismissRecommendation({ id: "rec-1" }, "user-1");

      expect(result.isDismissed).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        "ai.recommendationDismissed",
        expect.objectContaining({ entityId: "rec-1" }),
      );
    });

    it("throws RECOMMENDATION_NOT_FOUND when not found", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { dismissRecommendation, AiScoutingServiceError } =
        await import("./ai-scouting.service");

      vi.mocked(prisma.scoutingRecommendation.findUnique).mockResolvedValue(null);

      await expect(dismissRecommendation({ id: "nonexistent" }, "user-1")).rejects.toThrow(
        AiScoutingServiceError,
      );
    });
  });

  describe("linkRecommendation", () => {
    it("links a recommendation to an organization", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { eventBus } = await import("@/server/events/event-bus");
      const { linkRecommendation } = await import("./ai-scouting.service");

      vi.mocked(prisma.scoutingRecommendation.findUnique).mockResolvedValue({
        id: "rec-1",
        siaId: "sia-1",
      } as never);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as never);

      vi.mocked(prisma.scoutingRecommendation.update).mockResolvedValue({
        id: "rec-1",
        siaId: "sia-1",
        organizationId: "org-1",
        title: "Linked Rec",
        description: "Test",
        relevanceScore: 0.7,
        reasoning: "Test",
        source: "rule-based",
        isDismissed: false,
        createdAt: new Date("2026-01-01"),
      } as never);

      const result = await linkRecommendation({ id: "rec-1", organizationId: "org-1" }, "user-1");

      expect(result.organizationId).toBe("org-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "ai.recommendationLinked",
        expect.objectContaining({ entityId: "rec-1" }),
      );
    });

    it("throws ORGANIZATION_NOT_FOUND when org does not exist", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { linkRecommendation, AiScoutingServiceError } = await import("./ai-scouting.service");

      vi.mocked(prisma.scoutingRecommendation.findUnique).mockResolvedValue({
        id: "rec-1",
        siaId: "sia-1",
      } as never);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(
        linkRecommendation({ id: "rec-1", organizationId: "nonexistent" }, "user-1"),
      ).rejects.toThrow(AiScoutingServiceError);
    });
  });
});
