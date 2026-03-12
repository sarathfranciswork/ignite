import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  BeInspiredInput,
  CampaignSiaLinkInput,
  CampaignSiaUnlinkInput,
} from "./be-inspired.schemas";

const childLogger = logger.child({ service: "be-inspired" });

export class BeInspiredServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "BeInspiredServiceError";
  }
}

/**
 * Link a campaign to one or more SIAs via the CampaignSiaLink join table.
 */
export async function linkCampaignToSias(input: CampaignSiaLinkInput, userId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new BeInspiredServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const sias = await prisma.strategicInnovationArea.findMany({
    where: { id: { in: input.siaIds }, isActive: true },
    select: { id: true, name: true },
  });

  if (sias.length === 0) {
    throw new BeInspiredServiceError("SIA_NOT_FOUND", "No active SIAs found with the given IDs");
  }

  const links = await prisma.$transaction(
    sias.map((sia) =>
      prisma.campaignSiaLink.upsert({
        where: {
          campaignId_siaId: {
            campaignId: input.campaignId,
            siaId: sia.id,
          },
        },
        create: {
          campaignId: input.campaignId,
          siaId: sia.id,
        },
        update: {},
      }),
    ),
  );

  childLogger.info(
    { campaignId: input.campaignId, siaCount: links.length },
    "Campaign linked to SIAs",
  );

  for (const sia of sias) {
    eventBus.emit("sia.campaignLinked", {
      entity: "sia",
      entityId: sia.id,
      actor: userId,
      timestamp: new Date().toISOString(),
      metadata: { campaignId: input.campaignId, campaignTitle: campaign.title },
    });
  }

  return { success: true, linkedCount: links.length };
}

/**
 * Unlink a single SIA from a campaign.
 */
export async function unlinkCampaignFromSia(input: CampaignSiaUnlinkInput, userId: string) {
  const existing = await prisma.campaignSiaLink.findUnique({
    where: {
      campaignId_siaId: {
        campaignId: input.campaignId,
        siaId: input.siaId,
      },
    },
    include: {
      campaign: { select: { title: true } },
    },
  });

  if (!existing) {
    return { success: true };
  }

  await prisma.campaignSiaLink.delete({
    where: {
      campaignId_siaId: {
        campaignId: input.campaignId,
        siaId: input.siaId,
      },
    },
  });

  childLogger.info(
    { campaignId: input.campaignId, siaId: input.siaId },
    "Campaign unlinked from SIA",
  );

  eventBus.emit("sia.campaignUnlinked", {
    entity: "sia",
    entityId: input.siaId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId, campaignTitle: existing.campaign.title },
  });

  return { success: true };
}

/**
 * Get linked SIAs for a campaign.
 */
export async function getCampaignSias(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });

  if (!campaign) {
    throw new BeInspiredServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const links = await prisma.campaignSiaLink.findMany({
    where: { campaignId },
    include: {
      sia: {
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          bannerUrl: true,
          isActive: true,
        },
      },
    },
    orderBy: { sia: { name: "asc" } },
  });

  return links.map((link) => link.sia);
}

/**
 * Get "Be Inspired" content for a campaign: SIA descriptions, related trends,
 * technologies, and community insights.
 */
export async function getBeInspiredContent(input: BeInspiredInput) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true },
  });

  if (!campaign) {
    throw new BeInspiredServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const siaLinks = await prisma.campaignSiaLink.findMany({
    where: { campaignId: input.campaignId },
    select: { siaId: true },
  });

  const siaIds = siaLinks.map((link) => link.siaId);

  if (siaIds.length === 0) {
    return {
      sias: [],
      trends: [],
      technologies: [],
      insights: [],
    };
  }

  const [sias, trendSiaLinks, techSiaLinks] = await Promise.all([
    prisma.strategicInnovationArea.findMany({
      where: { id: { in: siaIds }, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        bannerUrl: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.trendSiaLink.findMany({
      where: { siaId: { in: siaIds } },
      include: {
        trend: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            sourceUrl: true,
            type: true,
            isArchived: true,
          },
        },
      },
    }),

    prisma.techSiaLink.findMany({
      where: { siaId: { in: siaIds } },
      include: {
        tech: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            sourceUrl: true,
            maturityLevel: true,
            isArchived: true,
          },
        },
      },
    }),
  ]);

  // Deduplicate trends (a trend may be linked to multiple SIAs)
  const trendMap = new Map<string, (typeof trendSiaLinks)[number]["trend"]>();
  for (const link of trendSiaLinks) {
    if (!link.trend.isArchived) {
      trendMap.set(link.trend.id, link.trend);
    }
  }
  const trends = Array.from(trendMap.values());

  // Deduplicate technologies
  const techMap = new Map<string, (typeof techSiaLinks)[number]["tech"]>();
  for (const link of techSiaLinks) {
    if (!link.tech.isArchived) {
      techMap.set(link.tech.id, link.tech);
    }
  }
  const technologies = Array.from(techMap.values());

  // Fetch insights linked to the related trends
  const trendIds = trends.map((t) => t.id);
  let insights: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    scope: string;
    sourceUrl: string | null;
  }> = [];

  if (trendIds.length > 0) {
    const insightLinks = await prisma.trendInsightLink.findMany({
      where: { trendId: { in: trendIds } },
      include: {
        insight: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            scope: true,
            sourceUrl: true,
            isArchived: true,
          },
        },
      },
    });

    const insightMap = new Map<string, (typeof insightLinks)[number]["insight"]>();
    for (const link of insightLinks) {
      if (!link.insight.isArchived) {
        insightMap.set(link.insight.id, link.insight);
      }
    }
    insights = Array.from(insightMap.values());
  }

  return {
    sias,
    trends: trends.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      imageUrl: t.imageUrl,
      sourceUrl: t.sourceUrl,
      type: t.type,
    })),
    technologies: technologies.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      imageUrl: t.imageUrl,
      sourceUrl: t.sourceUrl,
      maturityLevel: t.maturityLevel ?? "EMERGING",
    })),
    insights: insights.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      type: i.type,
      scope: i.scope,
      sourceUrl: i.sourceUrl,
    })),
  };
}
