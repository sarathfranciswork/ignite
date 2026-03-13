import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  GdprRequestExportInput,
  GdprRequestErasureInput,
  GdprGetStatusInput,
  GdprListRequestsInput,
} from "./compliance.schemas";

const childLogger = logger.child({ service: "gdpr" });

export class GdprServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "GdprServiceError";
  }
}

export async function requestDataExport(input: GdprRequestExportInput, actorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new GdprServiceError("User not found", "USER_NOT_FOUND");
  }

  const pendingRequest = await prisma.gdprRequest.findFirst({
    where: {
      userId: input.userId,
      requestType: "DATA_EXPORT",
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });
  if (pendingRequest) {
    throw new GdprServiceError(
      "A data export request is already in progress",
      "REQUEST_IN_PROGRESS",
    );
  }

  const request = await prisma.gdprRequest.create({
    data: {
      userId: input.userId,
      requestType: "DATA_EXPORT",
      status: "PENDING",
      requestedAt: new Date(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info(
    { requestId: request.id, userId: input.userId, actorId },
    "GDPR data export requested",
  );

  eventBus.emit("gdpr.exportRequested", {
    entity: "GdprRequest",
    entityId: request.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId: input.userId, requestType: "DATA_EXPORT" },
  });

  return request;
}

export async function requestDataErasure(input: GdprRequestErasureInput, actorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new GdprServiceError("User not found", "USER_NOT_FOUND");
  }

  const pendingRequest = await prisma.gdprRequest.findFirst({
    where: {
      userId: input.userId,
      requestType: "DATA_ERASURE",
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });
  if (pendingRequest) {
    throw new GdprServiceError(
      "A data erasure request is already in progress",
      "REQUEST_IN_PROGRESS",
    );
  }

  const request = await prisma.gdprRequest.create({
    data: {
      userId: input.userId,
      requestType: "DATA_ERASURE",
      status: "PENDING",
      requestedAt: new Date(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info(
    { requestId: request.id, userId: input.userId, actorId },
    "GDPR data erasure requested",
  );

  eventBus.emit("gdpr.erasureRequested", {
    entity: "GdprRequest",
    entityId: request.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId: input.userId, requestType: "DATA_ERASURE" },
  });

  return request;
}

export async function processGdprRequest(requestId: string) {
  const request = await prisma.gdprRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!request) {
    throw new GdprServiceError("GDPR request not found", "NOT_FOUND");
  }
  if (request.status !== "PENDING") {
    throw new GdprServiceError("Request is not in PENDING state", "INVALID_STATE");
  }

  await prisma.gdprRequest.update({
    where: { id: requestId },
    data: { status: "PROCESSING" },
  });

  try {
    if (request.requestType === "DATA_EXPORT") {
      const exportData = await collectUserData(request.userId);
      const resultUrl = `data:application/json;base64,${Buffer.from(
        JSON.stringify(exportData, null, 2),
      ).toString("base64")}`;

      await prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          resultUrl,
        },
      });

      eventBus.emit("gdpr.exportCompleted", {
        entity: "GdprRequest",
        entityId: requestId,
        actor: "system",
        timestamp: new Date().toISOString(),
        metadata: { userId: request.userId },
      });
    } else if (request.requestType === "DATA_ERASURE") {
      await anonymizeUser(request.userId);

      await prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          notes: "User data anonymized successfully",
        },
      });

      eventBus.emit("gdpr.erasureCompleted", {
        entity: "GdprRequest",
        entityId: requestId,
        actor: "system",
        timestamp: new Date().toISOString(),
        metadata: { userId: request.userId },
      });
    }

    childLogger.info({ requestId, requestType: request.requestType }, "GDPR request processed");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Processing failed";

    await prisma.gdprRequest.update({
      where: { id: requestId },
      data: {
        status: "FAILED",
        notes: errorMessage,
      },
    });

    childLogger.error({ requestId, error: errorMessage }, "GDPR request processing failed");
    throw error;
  }
}

export async function getRequestStatus(input: GdprGetStatusInput, userId?: string) {
  const request = await prisma.gdprRequest.findUnique({
    where: { id: input.requestId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!request) {
    throw new GdprServiceError("GDPR request not found", "NOT_FOUND");
  }

  if (userId && request.userId !== userId) {
    throw new GdprServiceError("Not authorized to view this request", "FORBIDDEN");
  }

  return request;
}

export async function listRequests(input: GdprListRequestsInput) {
  const take = input.limit + 1;
  const items = await prisma.gdprRequest.findMany({
    where: input.userId ? { userId: input.userId } : {},
    take,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { requestedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return { items, nextCursor };
}

export async function anonymizeUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new GdprServiceError("User not found", "USER_NOT_FOUND");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: "Deleted User",
      email: `deleted-${userId}@anonymized.local`,
      image: null,
      bio: null,
      skills: [],
      password: null,
      isActive: false,
    },
  });

  childLogger.info({ userId }, "User data anonymized");
}

async function collectUserData(userId: string) {
  const [user, ideas, comments, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        skills: true,
        globalRole: true,
        createdAt: true,
      },
    }),
    prisma.idea.findMany({
      where: { contributorId: userId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    exportDate: new Date().toISOString(),
    user,
    ideas,
    comments,
    notifications,
  };
}
