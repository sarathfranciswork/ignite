import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  setPerspective,
  getPerspective,
  getCommentsByPerspective,
  getPerspectiveDistribution,
  removePerspective,
  PerspectiveServiceError,
} from "./discussion-perspective.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    comment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    discussionPerspective: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      groupBy: vi.fn(),
      delete: vi.fn(),
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

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");

const commentFindUnique = prisma.comment.findUnique as unknown as Mock;
const commentFindMany = prisma.comment.findMany as unknown as Mock;
const perspectiveUpsert = prisma.discussionPerspective.upsert as unknown as Mock;
const perspectiveFindUnique = prisma.discussionPerspective.findUnique as unknown as Mock;
const perspectiveGroupBy = prisma.discussionPerspective.groupBy as unknown as Mock;
const perspectiveDelete = prisma.discussionPerspective.delete as unknown as Mock;

describe("setPerspective", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets a perspective on a comment", async () => {
    commentFindUnique.mockResolvedValueOnce({ id: "c1", ideaId: "i1" });
    const mockPerspective = {
      id: "p1",
      commentId: "c1",
      perspective: "RED_EMOTION",
      createdAt: new Date(),
    };
    perspectiveUpsert.mockResolvedValueOnce(mockPerspective);

    const result = await setPerspective({
      commentId: "c1",
      perspective: "RED_EMOTION",
    });

    expect(result).toEqual(mockPerspective);
    expect(perspectiveUpsert).toHaveBeenCalledWith({
      where: { commentId: "c1" },
      create: { commentId: "c1", perspective: "RED_EMOTION" },
      update: { perspective: "RED_EMOTION" },
    });
  });

  it("throws when comment not found", async () => {
    commentFindUnique.mockResolvedValueOnce(null);

    await expect(
      setPerspective({ commentId: "nonexistent", perspective: "WHITE_FACTS" }),
    ).rejects.toThrow(PerspectiveServiceError);
  });
});

describe("getPerspective", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns perspective for a comment", async () => {
    const mockPerspective = {
      id: "p1",
      commentId: "c1",
      perspective: "GREEN_CREATIVITY",
      createdAt: new Date(),
    };
    perspectiveFindUnique.mockResolvedValueOnce(mockPerspective);

    const result = await getPerspective({ commentId: "c1" });
    expect(result).toEqual(mockPerspective);
  });

  it("returns null when no perspective set", async () => {
    perspectiveFindUnique.mockResolvedValueOnce(null);

    const result = await getPerspective({ commentId: "c1" });
    expect(result).toBeNull();
  });
});

describe("getCommentsByPerspective", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns comments filtered by perspective", async () => {
    commentFindMany.mockResolvedValueOnce([
      {
        id: "c1",
        content: "This is cautious",
        ideaId: "i1",
        authorId: "u1",
        author: { id: "u1", name: "Test", email: "t@t.com", image: null },
        perspective: {
          id: "p1",
          commentId: "c1",
          perspective: "BLACK_CAUTION",
          createdAt: new Date(),
        },
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-01T00:00:00Z"),
      },
    ]);

    const result = await getCommentsByPerspective({
      ideaId: "i1",
      perspective: "BLACK_CAUTION",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });
});

describe("getPerspectiveDistribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns perspective distribution for an idea", async () => {
    commentFindMany.mockResolvedValueOnce([{ id: "c1" }, { id: "c2" }, { id: "c3" }]);
    perspectiveGroupBy.mockResolvedValueOnce([
      { perspective: "WHITE_FACTS", _count: { id: 1 } },
      { perspective: "RED_EMOTION", _count: { id: 1 } },
    ]);

    const result = await getPerspectiveDistribution({ ideaId: "i1" });

    expect(result.totalComments).toBe(3);
    expect(result.withPerspective).toBe(2);
    expect(result.distribution).toHaveLength(2);
  });

  it("returns zero counts when no comments exist", async () => {
    commentFindMany.mockResolvedValueOnce([]);

    const result = await getPerspectiveDistribution({ ideaId: "i1" });

    expect(result.totalComments).toBe(0);
    expect(result.withPerspective).toBe(0);
    expect(result.distribution).toHaveLength(0);
  });
});

describe("removePerspective", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes perspective from a comment", async () => {
    perspectiveFindUnique.mockResolvedValueOnce({
      id: "p1",
      commentId: "c1",
      perspective: "BLUE_PROCESS",
    });
    perspectiveDelete.mockResolvedValueOnce({ id: "p1" });

    const result = await removePerspective({ commentId: "c1" });
    expect(result).toEqual({ deleted: true });
  });

  it("throws when no perspective exists", async () => {
    perspectiveFindUnique.mockResolvedValueOnce(null);

    await expect(removePerspective({ commentId: "c1" })).rejects.toThrow(PerspectiveServiceError);
  });
});
