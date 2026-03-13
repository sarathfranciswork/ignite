import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    userSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const sessionFindMany = prisma.userSession.findMany as unknown as Mock;
const sessionFindUnique = prisma.userSession.findUnique as unknown as Mock;
const sessionCreate = prisma.userSession.create as unknown as Mock;
const sessionDelete = prisma.userSession.delete as unknown as Mock;
const sessionDeleteMany = prisma.userSession.deleteMany as unknown as Mock;

const {
  listUserSessions,
  terminateSession,
  terminateAllOtherSessions,
  adminTerminateSession,
  createSession,
  SessionManagementError,
} = await import("./session-management.service");

describe("session-management.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listUserSessions", () => {
    it("returns all sessions for a user", async () => {
      const mockSessions = [
        {
          id: "session-1",
          deviceInfo: "Chrome",
          ipAddress: "192.168.1.1",
          lastActivityAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: "session-2",
          deviceInfo: "Firefox",
          ipAddress: "10.0.0.1",
          lastActivityAt: new Date(),
          createdAt: new Date(),
        },
      ];
      sessionFindMany.mockResolvedValue(mockSessions);

      const result = await listUserSessions({ userId: "user-1" });

      expect(result).toHaveLength(2);
      expect(sessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        }),
      );
    });
  });

  describe("terminateSession", () => {
    it("terminates a session belonging to the user", async () => {
      sessionFindUnique.mockResolvedValue({
        id: "session-2",
        userId: "user-1",
      });
      sessionDelete.mockResolvedValue({ id: "session-2" });

      const result = await terminateSession({
        sessionId: "session-2",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(sessionDelete).toHaveBeenCalledWith({
        where: { id: "session-2" },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "session.terminated",
        expect.objectContaining({
          entity: "session",
          entityId: "session-2",
        }),
      );
    });

    it("throws if session not found", async () => {
      sessionFindUnique.mockResolvedValue(null);

      await expect(
        terminateSession({ sessionId: "nonexistent", userId: "user-1" }),
      ).rejects.toThrow(SessionManagementError);
    });

    it("throws if session belongs to another user", async () => {
      sessionFindUnique.mockResolvedValue({
        id: "session-2",
        userId: "user-2",
      });

      await expect(
        terminateSession({ sessionId: "session-2", userId: "user-1" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws if trying to terminate current session", async () => {
      await expect(
        terminateSession({
          sessionId: "session-1",
          userId: "user-1",
          currentSessionId: "session-1",
        }),
      ).rejects.toMatchObject({ code: "CANNOT_TERMINATE_CURRENT" });
    });
  });

  describe("terminateAllOtherSessions", () => {
    it("terminates all sessions except current", async () => {
      sessionDeleteMany.mockResolvedValue({ count: 3 });

      const result = await terminateAllOtherSessions({
        userId: "user-1",
        currentSessionId: "session-1",
      });

      expect(result.terminatedCount).toBe(3);
      expect(sessionDeleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          NOT: { id: "session-1" },
        },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "session.terminated",
        expect.objectContaining({
          metadata: expect.objectContaining({ type: "terminateAll" }),
        }),
      );
    });

    it("does not emit event when no sessions terminated", async () => {
      sessionDeleteMany.mockResolvedValue({ count: 0 });

      await terminateAllOtherSessions({
        userId: "user-1",
        currentSessionId: "session-1",
      });

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe("adminTerminateSession", () => {
    it("terminates any session as admin", async () => {
      sessionFindUnique.mockResolvedValue({
        id: "session-2",
        userId: "user-1",
      });
      sessionDelete.mockResolvedValue({ id: "session-2" });

      const result = await adminTerminateSession({ sessionId: "session-2" });

      expect(result.success).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        "session.terminated",
        expect.objectContaining({
          metadata: expect.objectContaining({ terminatedBy: "admin" }),
        }),
      );
    });

    it("throws if session not found", async () => {
      sessionFindUnique.mockResolvedValue(null);

      await expect(adminTerminateSession({ sessionId: "nonexistent" })).rejects.toMatchObject({
        code: "SESSION_NOT_FOUND",
      });
    });
  });

  describe("createSession", () => {
    it("creates a new session record", async () => {
      const mockSession = {
        id: "session-new",
        deviceInfo: "Chrome",
        ipAddress: "192.168.1.1",
        lastActivityAt: new Date(),
        createdAt: new Date(),
      };
      sessionCreate.mockResolvedValue(mockSession);

      const result = await createSession({
        userId: "user-1",
        deviceInfo: "Chrome",
        ipAddress: "192.168.1.1",
      });

      expect(result.id).toBe("session-new");
      expect(sessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            deviceInfo: "Chrome",
            ipAddress: "192.168.1.1",
          }),
        }),
      );
    });
  });
});
