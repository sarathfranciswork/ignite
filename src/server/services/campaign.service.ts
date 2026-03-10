import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import {
  isValidTransition,
  getTransitionDef,
} from "@/server/lib/state-machines/campaign-transitions";
import type { CampaignStatus, Prisma } from "@prisma/client";

const childLogger = logger.child({ service: "campaign" });

// ── Input Schemas ──────────────────────────────────────────

export const campaignCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sponsorId: z.string().cuid().optional().nullable(),
});

export type CampaignCreateInput = z.infer<typeof campaignCreateInput>;

export const campaignUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullish(),
  teaser: z.string().max(500).nullish(),
  bannerUrl: z.string().url().nullish(),
  startDate: z.string().datetime().nullish(),
  endDate: z.string().datetime().nullish(),
  sponsorId: z.string().cuid().nullish(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isConfidential: z.boolean().optional(),
});

export type CampaignUpdateInput = z.infer<typeof campaignUpdateInput>;

export const campaignGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const campaignListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: z
    .enum(["DRAFT", "SEEDING", "SUBMISSION", "DISCUSSION_VOTING", "EVALUATION", "CLOSED"])
    .optional(),
  search: z.string().max(200).optional(),
});

export type CampaignListInput = z.infer<typeof campaignListInput>;

export const campaignDeleteInput = z.object({
  id: z.string().cuid(),
});

export const campaignTransitionInput = z.object({
  id: z.string().cuid(),
  to: z.enum(["DRAFT", "SEEDING", "SUBMISSION", "DISCUSSION_VOTING", "EVALUATION", "CLOSED"]),
});

export type CampaignTransitionInput = z.infer<typeof campaignTransitionInput>;

// ── Select Fields ──────────────────────────────────────────

const campaignSelectFields = {
  id: true,
  title: true,
  description: true,
  teaser: true,
  bannerUrl: true,
  status: true,
  previousStatus: true,
  startDate: true,
  endDate: true,
  sponsorId: true,
  tags: true,
  isConfidential: true,
  settings: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  sponsor: {
    select: { id: true, name: true, email: true, image: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true, image: true },
  },
} as const;

const campaignListSelectFields = {
  id: true,
  title: true,
  teaser: true,
  bannerUrl: true,
  status: true,
  startDate: true,
  endDate: true,
  tags: true,
  isConfidential: true,
  createdAt: true,
  sponsor: {
    select: { id: true, name: true, image: true },
  },
  createdBy: {
    select: { id: true, name: true },
  },
} as const;

// ── Service Functions ──────────────────────────────────────

export async function createCampaign(input: CampaignCreateInput, actorId: string) {
  if (input.startDate && input.endDate) {
    if (new Date(input.endDate) <= new Date(input.startDate)) {
      throw new CampaignServiceError("End date must be after start date", "INVALID_DATES");
    }
  }

  if (input.sponsorId) {
    const sponsor = await prisma.user.findUnique({
      where: { id: input.sponsorId },
      select: { id: true, isActive: true },
    });
    if (!sponsor || !sponsor.isActive) {
      throw new CampaignServiceError("Sponsor not found or inactive", "SPONSOR_NOT_FOUND");
    }
  }

  const campaign = await prisma.campaign.create({
    data: {
      title: input.title,
      description: input.description,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      sponsorId: input.sponsorId ?? null,
      createdById: actorId,
    },
    select: campaignSelectFields,
  });

  childLogger.info({ campaignId: campaign.id, actorId }, "Campaign created");

  eventBus.emit("campaign.created", {
    entity: "campaign",
    entityId: campaign.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: campaign.title, status: campaign.status },
  });

  return campaign;
}

export async function getCampaignById(id: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: campaignSelectFields,
  });

  if (!campaign) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  return campaign;
}

export async function listCampaigns(input: CampaignListInput) {
  const where: Prisma.CampaignWhereInput = {};

  if (input.status) {
    where.status = input.status;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
      { teaser: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.campaign.findMany({
    where,
    select: campaignListSelectFields,
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return { items, nextCursor };
}

export async function updateCampaign(input: CampaignUpdateInput, actorId: string) {
  const existing = await prisma.campaign.findUnique({
    where: { id: input.id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  if (input.sponsorId) {
    const sponsor = await prisma.user.findUnique({
      where: { id: input.sponsorId },
      select: { id: true, isActive: true },
    });
    if (!sponsor || !sponsor.isActive) {
      throw new CampaignServiceError("Sponsor not found or inactive", "SPONSOR_NOT_FOUND");
    }
  }

  const { id, ...data } = input;

  const updateData: Prisma.CampaignUpdateInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.teaser !== undefined) updateData.teaser = data.teaser;
  if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.isConfidential !== undefined) updateData.isConfidential = data.isConfidential;

  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  }
  if (data.sponsorId !== undefined) {
    updateData.sponsor = data.sponsorId
      ? { connect: { id: data.sponsorId } }
      : { disconnect: true };
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
    select: campaignSelectFields,
  });

  childLogger.info({ campaignId: campaign.id, actorId }, "Campaign updated");

  eventBus.emit("campaign.updated", {
    entity: "campaign",
    entityId: campaign.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: campaign.title },
  });

  return campaign;
}

export async function deleteCampaign(id: string, actorId: string) {
  const existing = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, status: true, title: true },
  });

  if (!existing) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  if (existing.status !== "DRAFT") {
    throw new CampaignServiceError(
      "Only draft campaigns can be deleted",
      "CANNOT_DELETE_NON_DRAFT",
    );
  }

  await prisma.campaign.delete({ where: { id } });

  childLogger.info({ campaignId: id, actorId }, "Campaign deleted");

  eventBus.emit("campaign.deleted", {
    entity: "campaign",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title },
  });
}

/**
 * Transition a campaign to a new status via the state machine.
 * This is the ONLY function that should change campaign status.
 */
export async function transitionCampaign(input: CampaignTransitionInput, actorId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, title: true },
  });

  if (!campaign) {
    throw new CampaignServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const from = campaign.status;
  const to = input.to as CampaignStatus;

  if (!isValidTransition(from, to)) {
    throw new CampaignServiceError(`Cannot transition from ${from} to ${to}`, "INVALID_TRANSITION");
  }

  const transitionDef = getTransitionDef(from, to);
  if (!transitionDef) {
    throw new CampaignServiceError(
      `Transition definition not found for ${from} -> ${to}`,
      "INVALID_TRANSITION",
    );
  }

  if (transitionDef.guard) {
    const allowed = await transitionDef.guard({
      campaignId: campaign.id,
      actorId,
    });
    if (!allowed) {
      throw new CampaignServiceError(
        `Guard check failed for transition ${from} -> ${to}`,
        "GUARD_FAILED",
      );
    }
  }

  const updated = await prisma.campaign.update({
    where: { id: input.id },
    data: {
      status: to,
      previousStatus: from,
    },
    select: campaignSelectFields,
  });

  childLogger.info({ campaignId: campaign.id, from, to, actorId }, "Campaign phase changed");

  for (const effect of transitionDef.effects) {
    eventBus.emit(effect, {
      entity: "campaign",
      entityId: campaign.id,
      actor: actorId,
      timestamp: new Date().toISOString(),
      metadata: { from, to, title: campaign.title },
    });
  }

  return updated;
}

// ── Error Class ────────────────────────────────────────────

export class CampaignServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "CampaignServiceError";
    this.code = code;
  }
}
