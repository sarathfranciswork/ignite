import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";

export const listUserSessionsInput = z.object({
  userId: z.string().min(1),
});

export const createSessionInput = z.object({
  userId: z.string().min(1),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const terminateSessionInput = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
});

export const terminateAllOtherSessionsInput = z.object({
  userId: z.string().min(1),
  currentSessionId: z.string().min(1),
});

export const adminTerminateSessionInput = z.object({
  sessionId: z.string().min(1),
  adminUserId: z.string().min(1),
});

export const updateSessionActivityInput = z.object({
  sessionId: z.string().min(1),
});

export async function listUserSessions(input: z.infer<typeof listUserSessionsInput>) {
  const sessions = await prisma.userSession.findMany({
    where: {
      userId: input.userId,
      isActive: true,
    },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      lastActivityAt: true,
      createdAt: true,
    },
    orderBy: { lastActivityAt: "desc" },
  });

  return sessions;
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

  logger.info({ userId: input.userId, sessionId: session.id }, "User session created");

  return session;
}

export async function terminateSession(input: z.infer<typeof terminateSessionInput>) {
  const session = await prisma.userSession.findFirst({
    where: {
      id: input.sessionId,
      userId: input.userId,
      isActive: true,
    },
  });

  if (!session) {
    throw new SessionManagementError("Session not found", "SESSION_NOT_FOUND");
  }

  await prisma.userSession.update({
    where: { id: input.sessionId },
    data: { isActive: false },
  });

  logger.info({ userId: input.userId, sessionId: input.sessionId }, "User session terminated");

  eventBus.emit("session.terminated", {
    entity: "userSession",
    entityId: input.sessionId,
    actor: input.userId,
    timestamp: new Date().toISOString(),
    metadata: { targetUserId: input.userId },
  });
}

export async function terminateAllOtherSessions(
  input: z.infer<typeof terminateAllOtherSessionsInput>,
) {
  const result = await prisma.userSession.updateMany({
    where: {
      userId: input.userId,
      isActive: true,
      id: { not: input.currentSessionId },
    },
    data: { isActive: false },
  });

  logger.info(
    { userId: input.userId, terminatedCount: result.count },
    "All other sessions terminated",
  );

  eventBus.emit("session.allTerminated", {
    entity: "userSession",
    entityId: input.userId,
    actor: input.userId,
    timestamp: new Date().toISOString(),
    metadata: { terminatedCount: result.count },
  });

  return { terminatedCount: result.count };
}

export async function adminTerminateSession(input: z.infer<typeof adminTerminateSessionInput>) {
  const session = await prisma.userSession.findFirst({
    where: {
      id: input.sessionId,
      isActive: true,
    },
  });

  if (!session) {
    throw new SessionManagementError("Session not found", "SESSION_NOT_FOUND");
  }

  await prisma.userSession.update({
    where: { id: input.sessionId },
    data: { isActive: false },
  });

  logger.info(
    { adminUserId: input.adminUserId, sessionId: input.sessionId, targetUserId: session.userId },
    "Admin terminated user session",
  );

  eventBus.emit("session.terminated", {
    entity: "userSession",
    entityId: input.sessionId,
    actor: input.adminUserId,
    timestamp: new Date().toISOString(),
    metadata: { targetUserId: session.userId, adminAction: true },
  });
}

export async function updateSessionActivity(input: z.infer<typeof updateSessionActivityInput>) {
  await prisma.userSession.updateMany({
    where: {
      id: input.sessionId,
      isActive: true,
    },
    data: { lastActivityAt: new Date() },
  });
}

export class SessionManagementError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "SessionManagementError";
    this.code = code;
  }
}
