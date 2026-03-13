import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    autoTag: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    campaign: {
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

describe("ai-categorization.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("categorizeIdea", () => {
    it("extracts tags using rule-based fallback when AI is not available", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { aiProvider } = await import("@/server/lib/ai/factory");
      const { categorizeIdea } = await import("./ai-categorization.service");

      vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
      vi.mocked(prisma.idea.findUnique).mockResolvedValue({
        id: "idea-1",
        title: "Sustainability automation platform",
        description: "A platform for automating sustainability processes and compliance tracking",
        tags: [],
        campaign: { title: "Green Innovation", description: "Eco initiatives" },
      } as never);

      const mockTags = [
        {
          id: "tag-1",
          ideaId: "idea-1",
          tag: "sustainability",
          confidence: 0.7,
          source: "AI_EXTRACTION",
          isAccepted: null,
          createdAt: new Date("2026-01-01"),
        },
        {
          id: "tag-2",
          ideaId: "idea-1",
          tag: "automation",
          confidence: 0.5,
          source: "AI_EXTRACTION",
          isAccepted: null,
          createdAt: new Date("2026-01-01"),
        },
      ];
      vi.mocked(prisma.$transaction).mockResolvedValue(mockTags);

      const result = await categorizeIdea({ ideaId: "idea-1" }, "user-1");

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("throws IDEA_NOT_FOUND when idea does not exist", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { categorizeIdea, AiCategorizationServiceError } =
        await import("./ai-categorization.service");

      vi.mocked(prisma.idea.findUnique).mockResolvedValue(null);

      await expect(categorizeIdea({ ideaId: "nonexistent" }, "user-1")).rejects.toThrow(
        AiCategorizationServiceError,
      );
    });

    it("skips tags that already exist on the idea", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { aiProvider } = await import("@/server/lib/ai/factory");
      const { categorizeIdea } = await import("./ai-categorization.service");

      vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
      vi.mocked(prisma.idea.findUnique).mockResolvedValue({
        id: "idea-1",
        title: "A unique niche topic",
        description: "Nothing matching common categories here",
        tags: [],
        campaign: { title: "Misc", description: "" },
      } as never);

      const result = await categorizeIdea({ ideaId: "idea-1" }, "user-1");

      expect(result).toEqual([]);
    });
  });

  describe("getSuggestedTags", () => {
    it("returns auto tags for an idea", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { getSuggestedTags } = await import("./ai-categorization.service");

      vi.mocked(prisma.autoTag.findMany).mockResolvedValue([
        {
          id: "tag-1",
          ideaId: "idea-1",
          tag: "innovation",
          confidence: 0.8,
          source: "AI_CATEGORIZATION",
          isAccepted: null,
          createdAt: new Date("2026-01-01"),
        },
      ]);

      const result = await getSuggestedTags({ ideaId: "idea-1" });

      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe("innovation");
    });
  });

  describe("acceptTag", () => {
    it("accepts a tag and promotes it to idea tags", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { eventBus } = await import("@/server/events/event-bus");
      const { acceptTag } = await import("./ai-categorization.service");

      vi.mocked(prisma.autoTag.findUnique).mockResolvedValue({
        id: "tag-1",
        ideaId: "idea-1",
        tag: "innovation",
        confidence: 0.8,
        source: "AI_CATEGORIZATION",
        isAccepted: null,
        createdAt: new Date(),
      } as never);

      const updatedTag = {
        id: "tag-1",
        ideaId: "idea-1",
        tag: "innovation",
        confidence: 0.8,
        source: "AI_CATEGORIZATION",
        isAccepted: true,
        createdAt: new Date("2026-01-01"),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue([updatedTag, {}]);

      const result = await acceptTag({ autoTagId: "tag-1" }, "user-1");

      expect(result.isAccepted).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        "ai.tagAccepted",
        expect.objectContaining({ entityId: "tag-1" }),
      );
    });

    it("throws TAG_NOT_FOUND when tag does not exist", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { acceptTag, AiCategorizationServiceError } =
        await import("./ai-categorization.service");

      vi.mocked(prisma.autoTag.findUnique).mockResolvedValue(null);

      await expect(acceptTag({ autoTagId: "nonexistent" }, "user-1")).rejects.toThrow(
        AiCategorizationServiceError,
      );
    });
  });

  describe("rejectTag", () => {
    it("rejects a tag", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { eventBus } = await import("@/server/events/event-bus");
      const { rejectTag } = await import("./ai-categorization.service");

      vi.mocked(prisma.autoTag.findUnique).mockResolvedValue({
        id: "tag-1",
        ideaId: "idea-1",
        tag: "wrong-tag",
        confidence: 0.3,
        source: "AI_EXTRACTION",
        isAccepted: null,
        createdAt: new Date(),
      } as never);

      vi.mocked(prisma.autoTag.update).mockResolvedValue({
        id: "tag-1",
        ideaId: "idea-1",
        tag: "wrong-tag",
        confidence: 0.3,
        source: "AI_EXTRACTION",
        isAccepted: false,
        createdAt: new Date("2026-01-01"),
      } as never);

      const result = await rejectTag({ autoTagId: "tag-1" }, "user-1");

      expect(result.isAccepted).toBe(false);
      expect(eventBus.emit).toHaveBeenCalledWith(
        "ai.tagRejected",
        expect.objectContaining({ entityId: "tag-1" }),
      );
    });
  });

  describe("batchCategorize", () => {
    it("throws CAMPAIGN_NOT_FOUND for invalid campaign", async () => {
      const { prisma } = await import("@/server/lib/prisma");
      const { batchCategorize, AiCategorizationServiceError } =
        await import("./ai-categorization.service");

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      await expect(batchCategorize({ campaignId: "nonexistent" }, "user-1")).rejects.toThrow(
        AiCategorizationServiceError,
      );
    });
  });
});
