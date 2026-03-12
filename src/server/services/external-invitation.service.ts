import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { addDays } from "date-fns";

const childLogger = logger.child({ service: "external-invitation" });

const INVITATION_EXPIRY_DAYS = 7;

export class ExternalInvitationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ExternalInvitationServiceError";
  }
}

export async function createInvitation(input: {
  email: string;
  campaignIds: string[];
  inviterUserId: string;
}) {
  const { email, campaignIds, inviterUserId } = input;

  const existingPending = await prisma.externalInvitation.findFirst({
    where: { email, status: "PENDING" },
  });

  if (existingPending) {
    throw new ExternalInvitationServiceError(
      "A pending invitation already exists for this email",
      "DUPLICATE_INVITATION",
    );
  }

  for (const campaignId of campaignIds) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) {
      throw new ExternalInvitationServiceError(
        `Campaign ${campaignId} not found`,
        "CAMPAIGN_NOT_FOUND",
      );
    }
  }

  const invitation = await prisma.externalInvitation.create({
    data: {
      email,
      inviterUserId,
      campaignIds,
      expiresAt: addDays(new Date(), INVITATION_EXPIRY_DAYS),
    },
  });

  eventBus.emit("externalUser.invited", {
    entity: "externalInvitation",
    entityId: invitation.id,
    actor: inviterUserId,
    timestamp: new Date().toISOString(),
    metadata: { email, campaignIds },
  });

  childLogger.info({ invitationId: invitation.id, email }, "External invitation created");

  return invitation;
}

export async function acceptInvitation(input: { token: string }) {
  const { token } = input;

  const invitation = await prisma.externalInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new ExternalInvitationServiceError("Invitation not found", "INVITATION_NOT_FOUND");
  }

  if (invitation.status === "REVOKED") {
    throw new ExternalInvitationServiceError(
      "This invitation has been revoked",
      "INVITATION_REVOKED",
    );
  }

  if (invitation.status === "ACCEPTED") {
    throw new ExternalInvitationServiceError(
      "This invitation has already been accepted",
      "INVITATION_ALREADY_ACCEPTED",
    );
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.externalInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new ExternalInvitationServiceError("This invitation has expired", "INVITATION_EXPIRED");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, externalCampaignIds: true },
  });

  let userId: string;

  if (existingUser) {
    const mergedCampaignIds = Array.from(
      new Set([...existingUser.externalCampaignIds, ...invitation.campaignIds]),
    );
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        globalRole: "EXTERNAL",
        externalCampaignIds: mergedCampaignIds,
      },
    });
    userId = existingUser.id;
  } else {
    const newUser = await prisma.user.create({
      data: {
        email: invitation.email,
        globalRole: "EXTERNAL",
        externalCampaignIds: invitation.campaignIds,
      },
    });
    userId = newUser.id;
  }

  for (const campaignId of invitation.campaignIds) {
    const existingMember = await prisma.campaignMember.findFirst({
      where: { campaignId, userId },
    });
    if (!existingMember) {
      await prisma.campaignMember.create({
        data: {
          campaignId,
          userId,
          role: "CAMPAIGN_CONTRIBUTOR",
          assignedBy: invitation.inviterUserId,
        },
      });
    }
  }

  await prisma.externalInvitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED" },
  });

  eventBus.emit("externalUser.accepted", {
    entity: "externalInvitation",
    entityId: invitation.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { email: invitation.email, campaignIds: invitation.campaignIds },
  });

  childLogger.info({ invitationId: invitation.id, userId }, "External invitation accepted");

  return { userId, campaignIds: invitation.campaignIds };
}

export async function revokeInvitation(input: { id: string; revokedBy: string }) {
  const { id, revokedBy } = input;

  const invitation = await prisma.externalInvitation.findUnique({
    where: { id },
  });

  if (!invitation) {
    throw new ExternalInvitationServiceError("Invitation not found", "INVITATION_NOT_FOUND");
  }

  if (invitation.status !== "PENDING") {
    throw new ExternalInvitationServiceError(
      "Only pending invitations can be revoked",
      "INVALID_STATUS",
    );
  }

  const updated = await prisma.externalInvitation.update({
    where: { id },
    data: { status: "REVOKED" },
  });

  childLogger.info({ invitationId: id, revokedBy }, "External invitation revoked");

  return updated;
}

export async function listInvitations(input: {
  campaignId?: string;
  cursor?: string;
  limit: number;
}) {
  const { campaignId, cursor, limit } = input;

  const where: Record<string, unknown> = {};
  if (campaignId) {
    where.campaignIds = { has: campaignId };
  }

  const items = await prisma.externalInvitation.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      inviter: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  let nextCursor: string | undefined;
  if (items.length > limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return { items, nextCursor };
}

export async function revokeUserAccess(input: {
  userId: string;
  campaignId: string;
  revokedBy: string;
}) {
  const { userId, campaignId, revokedBy } = input;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, globalRole: true, externalCampaignIds: true },
  });

  if (!user) {
    throw new ExternalInvitationServiceError("User not found", "USER_NOT_FOUND");
  }

  if (user.globalRole !== "EXTERNAL") {
    throw new ExternalInvitationServiceError("User is not an external user", "NOT_EXTERNAL_USER");
  }

  const updatedCampaignIds = user.externalCampaignIds.filter((id) => id !== campaignId);

  await prisma.user.update({
    where: { id: userId },
    data: { externalCampaignIds: updatedCampaignIds },
  });

  await prisma.campaignMember.deleteMany({
    where: { campaignId, userId },
  });

  childLogger.info({ userId, campaignId, revokedBy }, "External user campaign access revoked");

  return { userId, remainingCampaignIds: updatedCampaignIds };
}
