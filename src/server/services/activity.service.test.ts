import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createActivityEvent,
  listActivityByIdea,
  listActivityByCampaign,
} from "./activity.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    activityEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

const { prisma } = await import("@/server/lib/prisma");

const activityCreate = prisma.activityEvent.create as unknown as Mock;
const activityFindMany = prisma.activityEvent.findMany as unknown as Mock;

const baseActivity = {
  id: "activity-1",
  ideaId: "idea-1",
  campaignId: "campaign-1",
  actorId: "user-1",
  eventType: "idea.submitted",
  title: "Idea submitted",
  body: "Test idea was submitted",
  metadata: null,
  createdAt: new Date("2026-03-01T10:00:00Z"),
  actor: { id: "user-1", name: "Test User", email: "test@example.com", image: null },
};

describe("createActivityEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an activity event", async () => {
    activityCreate.mockResolvedValueOnce(baseActivity);

    const result = await createActivityEvent({
      ideaId: "idea-1",
      campaignId: "campaign-1",
      actorId: "user-1",
      eventType: "idea.submitted",
      title: "Idea submitted",
      body: "Test idea was submitted",
    });

    expect(activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ideaId: "idea-1",
        campaignId: "campaign-1",
        actorId: "user-1",
        eventType: "idea.submitted",
      }),
    });
    expect(result).toEqual(baseActivity);
  });
});

describe("listActivityByIdea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated activity events for an idea", async () => {
    activityFindMany.mockResolvedValueOnce([baseActivity]);

    const result = await listActivityByIdea({ ideaId: "idea-1", limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("activity-1");
    expect(result.items[0]?.createdAt).toBe("2026-03-01T10:00:00.000Z");
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns nextCursor when there are more items", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...baseActivity,
      id: `activity-${i}`,
    }));
    activityFindMany.mockResolvedValueOnce(items);

    const result = await listActivityByIdea({ ideaId: "idea-1", limit: 20 });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("activity-20");
  });

  it("uses cursor for pagination", async () => {
    activityFindMany.mockResolvedValueOnce([]);

    await listActivityByIdea({ ideaId: "idea-1", limit: 20, cursor: "activity-10" });

    expect(activityFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "activity-10" },
      }),
    );
  });
});

describe("listActivityByCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated activity events for a campaign", async () => {
    activityFindMany.mockResolvedValueOnce([baseActivity]);

    const result = await listActivityByCampaign({ campaignId: "campaign-1", limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });
});
