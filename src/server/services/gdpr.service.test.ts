import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  requestDataExport,
  requestDataErasure,
  processGdprRequest,
  getRequestStatus,
  listRequests,
  anonymizeUser,
  GdprServiceError,
} from "./gdpr.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    gdprRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    idea: { findMany: vi.fn() },
    comment: { findMany: vi.fn() },
    notification: { findMany: vi.fn() },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;
const gdprCreate = prisma.gdprRequest.create as unknown as Mock;
const gdprFindUnique = prisma.gdprRequest.findUnique as unknown as Mock;
const gdprFindFirst = prisma.gdprRequest.findFirst as unknown as Mock;
const gdprFindMany = prisma.gdprRequest.findMany as unknown as Mock;
const gdprUpdate = prisma.gdprRequest.update as unknown as Mock;
const ideaFindMany = prisma.idea.findMany as unknown as Mock;
const commentFindMany = prisma.comment.findMany as unknown as Mock;
const notifFindMany = prisma.notification.findMany as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockUser = {
  id: "user1",
  email: "user@test.com",
  name: "Test User",
};

const mockRequest = {
  id: "req1",
  userId: "user1",
  requestType: "DATA_EXPORT",
  status: "PENDING",
  requestedAt: new Date(),
  completedAt: null,
  resultUrl: null,
  notes: null,
  user: mockUser,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requestDataExport", () => {
  it("creates a data export request", async () => {
    userFindUnique.mockResolvedValue(mockUser);
    gdprFindFirst.mockResolvedValue(null);
    gdprCreate.mockResolvedValue(mockRequest);

    const result = await requestDataExport({ userId: "user1" }, "admin1");

    expect(result.requestType).toBe("DATA_EXPORT");
    expect(gdprCreate).toHaveBeenCalledOnce();
    expect(mockEmit).toHaveBeenCalledWith(
      "gdpr.exportRequested",
      expect.objectContaining({ entity: "GdprRequest" }),
    );
  });

  it("throws when user not found", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(requestDataExport({ userId: "missing" }, "admin1")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  it("throws when request already in progress", async () => {
    userFindUnique.mockResolvedValue(mockUser);
    gdprFindFirst.mockResolvedValue(mockRequest);

    await expect(requestDataExport({ userId: "user1" }, "admin1")).rejects.toMatchObject({
      code: "REQUEST_IN_PROGRESS",
    });
  });
});

describe("requestDataErasure", () => {
  it("creates a data erasure request", async () => {
    userFindUnique.mockResolvedValue(mockUser);
    gdprFindFirst.mockResolvedValue(null);
    gdprCreate.mockResolvedValue({ ...mockRequest, requestType: "DATA_ERASURE" });

    const result = await requestDataErasure({ userId: "user1" }, "admin1");

    expect(result.requestType).toBe("DATA_ERASURE");
    expect(mockEmit).toHaveBeenCalledWith(
      "gdpr.erasureRequested",
      expect.objectContaining({ entity: "GdprRequest" }),
    );
  });
});

describe("processGdprRequest", () => {
  it("processes a data export request", async () => {
    gdprFindUnique.mockResolvedValue({
      ...mockRequest,
      user: mockUser,
    });
    gdprUpdate.mockResolvedValue({ ...mockRequest, status: "COMPLETED" });
    userFindUnique.mockResolvedValue(mockUser);
    ideaFindMany.mockResolvedValue([]);
    commentFindMany.mockResolvedValue([]);
    notifFindMany.mockResolvedValue([]);

    await processGdprRequest("req1");

    expect(gdprUpdate).toHaveBeenCalledTimes(2);
    expect(mockEmit).toHaveBeenCalledWith(
      "gdpr.exportCompleted",
      expect.objectContaining({ entityId: "req1" }),
    );
  });

  it("processes a data erasure request", async () => {
    const erasureRequest = {
      ...mockRequest,
      requestType: "DATA_ERASURE",
      user: mockUser,
    };
    gdprFindUnique.mockResolvedValue(erasureRequest);
    gdprUpdate.mockResolvedValue({ ...erasureRequest, status: "COMPLETED" });
    userFindUnique.mockResolvedValue(mockUser);
    userUpdate.mockResolvedValue({});

    await processGdprRequest("req1");

    expect(userUpdate).toHaveBeenCalledOnce();
    expect(mockEmit).toHaveBeenCalledWith(
      "gdpr.erasureCompleted",
      expect.objectContaining({ entityId: "req1" }),
    );
  });

  it("throws when request not found", async () => {
    gdprFindUnique.mockResolvedValue(null);

    await expect(processGdprRequest("missing")).rejects.toThrow(GdprServiceError);
  });

  it("throws when request is not pending", async () => {
    gdprFindUnique.mockResolvedValue({ ...mockRequest, status: "COMPLETED" });

    await expect(processGdprRequest("req1")).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});

describe("getRequestStatus", () => {
  it("returns request status for own request", async () => {
    gdprFindUnique.mockResolvedValue(mockRequest);

    const result = await getRequestStatus({ requestId: "req1" }, "user1");

    expect(result.id).toBe("req1");
  });

  it("throws FORBIDDEN for other user's request", async () => {
    gdprFindUnique.mockResolvedValue(mockRequest);

    await expect(getRequestStatus({ requestId: "req1" }, "other-user")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("listRequests", () => {
  it("returns paginated requests", async () => {
    gdprFindMany.mockResolvedValue([mockRequest]);

    const result = await listRequests({ limit: 20 });

    expect(result.items).toHaveLength(1);
  });
});

describe("anonymizeUser", () => {
  it("anonymizes user data", async () => {
    userFindUnique.mockResolvedValue(mockUser);
    userUpdate.mockResolvedValue({});

    await anonymizeUser("user1");

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: expect.objectContaining({
        name: "Deleted User",
        bio: null,
        skills: [],
        isActive: false,
      }),
    });
  });

  it("throws when user not found", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(anonymizeUser("missing")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});
