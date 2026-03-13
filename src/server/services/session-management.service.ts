import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";

export const listUserSessionsInput = z.object({
  userId: z.string(),
});

export const terminateSessionInput = z.object({
  sessionId: z.string(),
  userId: z.string(),
  currentSessionId: z.string().optional(),
});

export const terminateAllOtherSessionsInput = z.object({
  userId: z.string(),
  currentSessionId: z.string(),
});

export const adminTerminateSessionInput = z.object({
  sessionId: z.string(),
});

export const updateSessionActivityInput = z.object({
  sessionId: z.string(),
});

export const createSessionInput = z.object({
  userId: z.string(),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
});

export async function listUserSessions(input: z.infer<typeof listUserSessionsInput>) {
  const sessions = await prisma.userSession.findMany({
    where: { userId: input.userId },
    orderBy: { lastActivityAt: "desc" },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      lastActivityAt: true,
      createdAt: true,
    },
  });

  return sessions;
}

export async function terminateSession(input: z.infer<typeof terminateSessionInput>) {
  if (input.currentSessionId && input.sessionId === input.currentSessionId) {
    throw new SessionManagementError(
      "Cannot terminate current session",
      "CANNOT_TERMINATE_CURRENT",
    );
  }

  const session = await prisma.userSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, userId: true },
  });

  if (!session) {
    throw new SessionManagementError("Session not found", "SESSION_NOT_FOUND");
  }

  if (session.userId !== input.userId) {
    throw new SessionManagementError("Session does not belong to user", "UNAUTHORIZED");
  }

  await prisma.userSession.delete({
    where: { id: input.sessionId },
  });

  logger.info({ sessionId: input.sessionId, userId: input.userId }, "Session terminated");

  eventBus.emit("session.terminated", {
    entity: "session",
    entityId: input.sessionId,
    actor: input.userId,
    timestamp: new Date().toISOString(),
    metadata: { terminatedBy: "user" },
  });

  return { success: true };
}

export async function terminateAllOtherSessions(
  input: z.infer<typeof terminateAllOtherSessionsInput>,
) {
  const result = await prisma.userSession.deleteMany({
    where: {
      userId: input.userId,
      NOT: { id: input.currentSessionId },
    },
  });

  logger.info({ userId: input.userId, count: result.count }, "All other sessions terminated");

  if (result.count > 0) {
    eventBus.emit("session.terminated", {
      entity: "session",
      entityId: input.userId,
      actor: input.userId,
      timestamp: new Date().toISOString(),
      metadata: { terminatedBy: "user", count: result.count, type: "terminateAll" },
    });
  }

  return { terminatedCount: result.count };
}

export async function adminTerminateSession(input: z.infer<typeof adminTerminateSessionInput>) {
  const session = await prisma.userSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, userId: true },
  });

  if (!session) {
    throw new SessionManagementError("Session not found", "SESSION_NOT_FOUND");
  }

  await prisma.userSession.delete({
    where: { id: input.sessionId },
  });

  logger.info({ sessionId: input.sessionId }, "Session terminated by admin");

  eventBus.emit("session.terminated", {
    entity: "session",
    entityId: input.sessionId,
    actor: "admin",
    timestamp: new Date().toISOString(),
    metadata: { terminatedBy: "admin" },
  });

  return { success: true };
}

export async function updateSessionActivity(input: z.infer<typeof updateSessionActivityInput>) {
  await prisma.userSession.update({
    where: { id: input.sessionId },
    data: { lastActivityAt: new Date() },
  });
}

export async function createSession(input: z.infer<typeof createSessionInput>) {
  const session = await prisma.userSession.create({
    data: {
      userId: input.userId,
      deviceInfo: input.deviceInfo ?? null,
      ipAddress: input.ipAddress ?? null,
    },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      lastActivityAt: true,
      createdAt: true,
    },
  });

  logger.info({ sessionId: session.id, userId: input.userId }, "User session created");

  return session;
}

export class SessionManagementError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "SessionManagementError";
    this.code = code;
  }
}
