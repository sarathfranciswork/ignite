import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listUserSessions,
  createSession,
  terminateSession,
  terminateAllOtherSessions,
  adminTerminateSession,
  updateSessionActivity,
  SessionManagementError,
  listUserSessionsInput,
  terminateSessionInput,
} from "./session-management.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    userSession: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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

const prismaMock = prisma as unknown as Record<string, Record<string, Mock>>;
const sessionFindMany = prismaMock.userSession.findMany as Mock;
const sessionFindFirst = prismaMock.userSession.findFirst as Mock;
const sessionCreate = prismaMock.userSession.create as Mock;
const sessionUpdate = prismaMock.userSession.update as Mock;
const sessionUpdateMany = prismaMock.userSession.updateMany as Mock;

const mockSession = {
  id: "session-1",
  userId: "user-1",
  deviceInfo: "Chrome on macOS",
  ipAddress: "192.168.1.1",
  lastActivityAt: new Date("2026-01-15"),
  isActive: true,
  createdAt: new Date("2026-01-01"),
};

describe("session-management.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("input schemas", () => {
    it("validates listUserSessionsInput", () => {
      expect(listUserSessionsInput.safeParse({ userId: "user-1" }).success).toBe(true);
      expect(listUserSessionsInput.safeParse({ userId: "" }).success).toBe(false);
    });

    it("validates terminateSessionInput", () => {
      expect(terminateSessionInput.safeParse({ sessionId: "s-1", userId: "u-1" }).success).toBe(
        true,
      );
      expect(terminateSessionInput.safeParse({ sessionId: "", userId: "u-1" }).success).toBe(false);
    });
  });

  describe("listUserSessions", () => {
    it("returns active sessions for a user", async () => {
      sessionFindMany.mockResolvedValue([mockSession]);

      const result = await listUserSessions({ userId: "user-1" });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "session-1",
        deviceInfo: "Chrome on macOS",
        ipAddress: "192.168.1.1",
      });
      expect(sessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", isActive: true },
        }),
      );
    });

    it("returns empty array when no sessions exist", async () => {
      sessionFindMany.mockResolvedValue([]);

      const result = await listUserSessions({ userId: "user-1" });
      expect(result).toHaveLength(0);
    });
  });

  describe("createSession", () => {
    it("creates a new session", async () => {
      sessionCreate.mockResolvedValue(mockSession);

      const result = await createSession({
        userId: "user-1",
        deviceInfo: "Chrome on macOS",
        ipAddress: "192.168.1.1",
      });

      expect(result.id).toBe("session-1");
      expect(sessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: "user-1",
            deviceInfo: "Chrome on macOS",
            ipAddress: "192.168.1.1",
          },
        }),
      );
    });
  });

  describe("terminateSession", () => {
    it("terminates a session owned by the user", async () => {
      sessionFindFirst.mockResolvedValue(mockSession);
      sessionUpdate.mockResolvedValue({ ...mockSession, isActive: false });

      await terminateSession({ sessionId: "session-1", userId: "user-1" });

      expect(sessionUpdate).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: { isActive: false },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "session.terminated",
        expect.objectContaining({
          entity: "userSession",
          entityId: "session-1",
          actor: "user-1",
        }),
      );
    });

    it("throws SESSION_NOT_FOUND for non-existent session", async () => {
      sessionFindFirst.mockResolvedValue(null);

      await expect(
        terminateSession({ sessionId: "nonexistent", userId: "user-1" }),
      ).rejects.toThrow(SessionManagementError);
      await expect(
        terminateSession({ sessionId: "nonexistent", userId: "user-1" }),
      ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
    });
  });

  describe("terminateAllOtherSessions", () => {
    it("terminates all sessions except current", async () => {
      sessionUpdateMany.mockResolvedValue({ count: 3 });

      const result = await terminateAllOtherSessions({
        userId: "user-1",
        currentSessionId: "session-1",
      });

      expect(result.terminatedCount).toBe(3);
      expect(sessionUpdateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          isActive: true,
          id: { not: "session-1" },
        },
        data: { isActive: false },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "session.allTerminated",
        expect.objectContaining({
          entity: "userSession",
          entityId: "user-1",
          metadata: { terminatedCount: 3 },
        }),
      );
    });
  });

  describe("adminTerminateSession", () => {
    it("allows admin to terminate any session", async () => {
      sessionFindFirst.mockResolvedValue(mockSession);
      sessionUpdate.mockResolvedValue({ ...mockSession, isActive: false });

      await adminTerminateSession({ sessionId: "session-1", adminUserId: "admin-1" });

      expect(sessionUpdate).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: { isActive: false },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "session.terminated",
        expect.objectContaining({
          actor: "admin-1",
          metadata: expect.objectContaining({ adminAction: true }),
        }),
      );
    });

    it("throws SESSION_NOT_FOUND for non-existent session", async () => {
      sessionFindFirst.mockResolvedValue(null);

      await expect(
        adminTerminateSession({ sessionId: "nonexistent", adminUserId: "admin-1" }),
      ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
    });
  });

  describe("updateSessionActivity", () => {
    it("updates lastActivityAt for an active session", async () => {
      sessionUpdateMany.mockResolvedValue({ count: 1 });

      await updateSessionActivity({ sessionId: "session-1" });

      expect(sessionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "session-1", isActive: true },
        }),
      );
    });
  });
});
