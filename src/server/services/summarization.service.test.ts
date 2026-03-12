import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSummarizationStatus,
  summarizeCampaign,
  summarizeEvaluationSession,
  summarizeNotificationDigest,
  SummarizationServiceError,
} from "./summarization.service";

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

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
    },
    idea: {
      findMany: vi.fn(),
    },
    evaluationSession: {
      findUnique: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
    },
  },
}));

describe("getSummarizationStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unavailable when text generation is not supported", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const status = getSummarizationStatus();

    expect(status).toEqual({
      available: false,
      aiPowered: false,
      provider: "test",
    });
  });

  it("returns available when text generation is supported", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);

    const status = getSummarizationStatus();

    expect(status).toEqual({
      available: true,
      aiPowered: true,
      provider: "test",
    });
  });
});

describe("summarizeCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when campaign not found", async () => {
    const { prisma } = await import("@/server/lib/prisma");
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

    await expect(summarizeCampaign("nonexistent")).rejects.toThrow(SummarizationServiceError);
    await expect(summarizeCampaign("nonexistent")).rejects.toThrow("Campaign not found");
  });

  it("returns empty result when AI is unavailable", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp-1",
      title: "Test Campaign",
      description: "A test campaign",
      status: "SUBMISSION",
      launchedAt: new Date(),
      closedAt: null,
    } as unknown as Awaited<ReturnType<typeof prisma.campaign.findUnique>>);

    const result = await summarizeCampaign("camp-1");

    expect(result).toEqual({
      campaignId: "camp-1",
      campaignTitle: "Test Campaign",
      engagementOverview: null,
      topThemes: [],
      aiPowered: false,
    });
  });

  it("returns message when campaign has no ideas", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp-1",
      title: "Empty Campaign",
      description: null,
      status: "DRAFT",
      launchedAt: null,
      closedAt: null,
    } as unknown as Awaited<ReturnType<typeof prisma.campaign.findUnique>>);
    vi.mocked(prisma.idea.findMany).mockResolvedValue([]);

    const result = await summarizeCampaign("camp-1");

    expect(result.engagementOverview).toBe("No ideas have been submitted to this campaign yet.");
    expect(result.aiPowered).toBe(false);
  });

  it("returns AI-powered summary when provider is available", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp-1",
      title: "Innovation Challenge",
      description: "A big challenge",
      status: "SUBMISSION",
      launchedAt: new Date(),
      closedAt: null,
    } as unknown as Awaited<ReturnType<typeof prisma.campaign.findUnique>>);
    vi.mocked(prisma.idea.findMany).mockResolvedValue([
      {
        title: "Idea 1",
        teaser: "An idea",
        status: "SUBMITTED",
        tags: ["automation", "efficiency"],
        likesCount: 10,
        commentsCount: 5,
        viewsCount: 100,
      },
      {
        title: "Idea 2",
        teaser: "Another idea",
        status: "SUBMITTED",
        tags: ["sustainability", "automation"],
        likesCount: 8,
        commentsCount: 3,
        viewsCount: 50,
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.idea.findMany>>);
    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: JSON.stringify({
        engagementOverview:
          "The campaign has 2 ideas with strong engagement: 18 likes, 8 comments, and 150 views.",
        topThemes: ["automation", "efficiency", "sustainability"],
      }),
      finishReason: "stop",
    });

    const result = await summarizeCampaign("camp-1");

    expect(result.aiPowered).toBe(true);
    expect(result.engagementOverview).toContain("2 ideas");
    expect(result.topThemes).toContain("automation");
    expect(result.topThemes).toContain("sustainability");
  });

  it("falls back to empty when AI returns invalid JSON", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp-1",
      title: "Test",
      description: null,
      status: "SUBMISSION",
      launchedAt: null,
      closedAt: null,
    } as unknown as Awaited<ReturnType<typeof prisma.campaign.findUnique>>);
    vi.mocked(prisma.idea.findMany).mockResolvedValue([
      {
        title: "Idea",
        teaser: null,
        status: "SUBMITTED",
        tags: [],
        likesCount: 1,
        commentsCount: 0,
        viewsCount: 5,
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.idea.findMany>>);
    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: "not valid json",
      finishReason: "stop",
    });

    const result = await summarizeCampaign("camp-1");

    expect(result.aiPowered).toBe(false);
    expect(result.engagementOverview).toBeNull();
  });

  it("falls back to empty when AI throws", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp-1",
      title: "Test",
      description: null,
      status: "SUBMISSION",
      launchedAt: null,
      closedAt: null,
    } as unknown as Awaited<ReturnType<typeof prisma.campaign.findUnique>>);
    vi.mocked(prisma.idea.findMany).mockResolvedValue([
      {
        title: "Idea",
        teaser: null,
        status: "SUBMITTED",
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.idea.findMany>>);
    vi.mocked(aiProvider.generateText).mockRejectedValue(new Error("API timeout"));

    const result = await summarizeCampaign("camp-1");

    expect(result.aiPowered).toBe(false);
    expect(result.engagementOverview).toBeNull();
  });
});

describe("summarizeEvaluationSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when session not found", async () => {
    const { prisma } = await import("@/server/lib/prisma");
    vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue(null);

    await expect(summarizeEvaluationSession("nonexistent")).rejects.toThrow(
      SummarizationServiceError,
    );
  });

  it("returns empty result when AI is unavailable", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);
    vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
      id: "sess-1",
      title: "Round 1",
      type: "CRITERIA_BASED",
      status: "COMPLETED",
      criteria: [{ title: "Innovation", weight: 50 }],
      evaluators: [{ userId: "user-1" }],
      ideas: [{ idea: { title: "Idea 1" } }],
      responses: [{ evaluatorId: "user-1", scoreValue: 8 }],
    } as unknown as Awaited<ReturnType<typeof prisma.evaluationSession.findUnique>>);

    const result = await summarizeEvaluationSession("sess-1");

    expect(result).toEqual({
      sessionId: "sess-1",
      sessionTitle: "Round 1",
      resultsDigest: null,
      aiPowered: false,
    });
  });

  it("returns AI-powered digest when provider is available", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
      id: "sess-1",
      title: "Innovation Evaluation",
      type: "CRITERIA_BASED",
      status: "COMPLETED",
      criteria: [
        { title: "Innovation", weight: 40 },
        { title: "Feasibility", weight: 30 },
        { title: "Impact", weight: 30 },
      ],
      evaluators: [{ userId: "user-1" }, { userId: "user-2" }, { userId: "user-3" }],
      ideas: [{ idea: { title: "Smart Widget" } }, { idea: { title: "Green Process" } }],
      responses: [
        { evaluatorId: "user-1", scoreValue: 8 },
        { evaluatorId: "user-2", scoreValue: 6 },
      ],
    } as unknown as Awaited<ReturnType<typeof prisma.evaluationSession.findUnique>>);
    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: "The evaluation had a 67% participation rate with 2 of 3 evaluators responding. Two ideas were assessed across Innovation, Feasibility, and Impact criteria.",
      finishReason: "stop",
    });

    const result = await summarizeEvaluationSession("sess-1");

    expect(result.aiPowered).toBe(true);
    expect(result.resultsDigest).toContain("67%");
  });
});

describe("summarizeNotificationDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty when AI is unavailable", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(false);

    const result = await summarizeNotificationDigest("user-1", 20);

    expect(result).toEqual({
      digest: null,
      notificationCount: 0,
      aiPowered: false,
    });
  });

  it("returns message when no unread notifications", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([]);

    const result = await summarizeNotificationDigest("user-1", 20);

    expect(result.digest).toBe("You have no unread notifications.");
    expect(result.notificationCount).toBe(0);
  });

  it("returns AI-powered digest for unread notifications", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      {
        type: "IDEA_SUBMITTED",
        title: "New idea submitted",
        body: "John submitted 'Smart Widget' to Innovation Challenge",
        createdAt: new Date(),
      },
      {
        type: "EVALUATION_REQUESTED",
        title: "Evaluation needed",
        body: "You have been assigned as evaluator for Round 1",
        createdAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.notification.findMany>>);
    vi.mocked(aiProvider.generateText).mockResolvedValue({
      text: "You have 2 unread notifications: a new idea submission in Innovation Challenge and a pending evaluation request for Round 1.",
      finishReason: "stop",
    });

    const result = await summarizeNotificationDigest("user-1", 20);

    expect(result.aiPowered).toBe(true);
    expect(result.notificationCount).toBe(2);
    expect(result.digest).toContain("2 unread notifications");
  });

  it("falls back when AI throws", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    const { prisma } = await import("@/server/lib/prisma");

    vi.mocked(aiProvider.supportsTextGeneration).mockReturnValue(true);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      {
        type: "IDEA_SUBMITTED",
        title: "New idea",
        body: "Test notification",
        createdAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.notification.findMany>>);
    vi.mocked(aiProvider.generateText).mockRejectedValue(new Error("Network error"));

    const result = await summarizeNotificationDigest("user-1", 20);

    expect(result.aiPowered).toBe(false);
    expect(result.notificationCount).toBe(1);
    expect(result.digest).toBeNull();
  });
});
