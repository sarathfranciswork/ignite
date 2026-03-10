import type { PrismaClient } from "@prisma/client";
import type {
  BeInspiredContent,
  InsightCard,
  TechnologyCard,
  TrendCard,
} from "@/types/campaign-sia";

/**
 * Campaign-SIA Service (Story 9.6)
 *
 * Handles linking campaigns to Strategic Innovation Areas and
 * assembling "Be Inspired" tab content from linked SIAs.
 */
export class CampaignSiaService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Link a campaign to one or more SIAs.
   * Existing links are preserved; only new links are created.
   */
  async linkCampaignToSias(
    campaignId: string,
    siaIds: string[],
  ): Promise<{ linked: number }> {
    const campaign = await this.db.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const existingSias = await this.db.strategicInnovationArea.findMany({
      where: { id: { in: siaIds }, isActive: true },
      select: { id: true },
    });
    const validSiaIds = new Set(existingSias.map((s) => s.id));

    const invalidIds = siaIds.filter((id) => !validSiaIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid or inactive SIA IDs: ${invalidIds.join(", ")}`);
    }

    const result = await this.db.$transaction(
      siaIds.map((siaId) =>
        this.db.campaignSiaLink.upsert({
          where: {
            campaignId_siaId: { campaignId, siaId },
          },
          create: { campaignId, siaId },
          update: {},
        }),
      ),
    );

    return { linked: result.length };
  }

  /**
   * Unlink a single SIA from a campaign.
   */
  async unlinkCampaignSia(campaignId: string, siaId: string): Promise<void> {
    await this.db.campaignSiaLink.delete({
      where: {
        campaignId_siaId: { campaignId, siaId },
      },
    });
  }

  /**
   * Replace all SIA links for a campaign (used in wizard save).
   */
  async setCampaignSias(
    campaignId: string,
    siaIds: string[],
  ): Promise<{ linked: number }> {
    const campaign = await this.db.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    await this.db.$transaction([
      this.db.campaignSiaLink.deleteMany({ where: { campaignId } }),
      ...siaIds.map((siaId) =>
        this.db.campaignSiaLink.create({
          data: { campaignId, siaId },
        }),
      ),
    ]);

    return { linked: siaIds.length };
  }

  /**
   * Get all SIAs linked to a campaign.
   */
  async getCampaignSias(campaignId: string) {
    const links = await this.db.campaignSiaLink.findMany({
      where: { campaignId },
      include: {
        sia: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return links.map((link) => link.sia);
  }

  /**
   * Get the full "Be Inspired" content for a campaign.
   *
   * Aggregates:
   * - Linked SIA descriptions
   * - Related trends (from SIA-linked trends)
   * - Related technologies (from SIA-linked technologies)
   * - Community insights (linked to SIA trends)
   */
  async getBeInspiredContent(campaignId: string): Promise<BeInspiredContent> {
    const siaLinks = await this.db.campaignSiaLink.findMany({
      where: { campaignId },
      include: {
        sia: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
          },
        },
      },
    });

    if (siaLinks.length === 0) {
      return {
        sias: [],
        trends: [],
        technologies: [],
        insights: [],
        hasSiaLinks: false,
      };
    }

    const sias = siaLinks.map((link) => link.sia);
    const siaIds = sias.map((sia) => sia.id);

    const [trendLinks, techLinks] = await Promise.all([
      this.db.trendSiaLink.findMany({
        where: { siaId: { in: siaIds } },
        include: {
          trend: {
            select: {
              id: true,
              title: true,
              description: true,
              imageUrl: true,
              type: true,
              businessRelevance: true,
              isArchived: true,
              isConfidential: true,
            },
          },
          sia: { select: { name: true } },
        },
      }),
      this.db.techSiaLink.findMany({
        where: { siaId: { in: siaIds } },
        include: {
          tech: {
            select: {
              id: true,
              title: true,
              description: true,
              imageUrl: true,
              maturityLevel: true,
              isArchived: true,
              isConfidential: true,
            },
          },
          sia: { select: { name: true } },
        },
      }),
    ]);

    // Filter out archived and confidential items, deduplicate by ID
    const seenTrendIds = new Set<string>();
    const trends: TrendCard[] = [];
    for (const link of trendLinks) {
      if (
        !link.trend.isArchived &&
        !link.trend.isConfidential &&
        !seenTrendIds.has(link.trend.id)
      ) {
        seenTrendIds.add(link.trend.id);
        trends.push({
          id: link.trend.id,
          title: link.trend.title,
          description: link.trend.description,
          imageUrl: link.trend.imageUrl,
          type: link.trend.type,
          businessRelevance: link.trend.businessRelevance,
          siaName: link.sia.name,
        });
      }
    }

    const seenTechIds = new Set<string>();
    const technologies: TechnologyCard[] = [];
    for (const link of techLinks) {
      if (
        !link.tech.isArchived &&
        !link.tech.isConfidential &&
        !seenTechIds.has(link.tech.id)
      ) {
        seenTechIds.add(link.tech.id);
        technologies.push({
          id: link.tech.id,
          title: link.tech.title,
          description: link.tech.description,
          imageUrl: link.tech.imageUrl,
          maturityLevel: link.tech.maturityLevel,
          siaName: link.sia.name,
        });
      }
    }

    // Get insights linked to the collected trends
    const trendIds = trends.map((t) => t.id);
    const insightLinks =
      trendIds.length > 0
        ? await this.db.trendInsightLink.findMany({
            where: { trendId: { in: trendIds } },
            include: {
              insight: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  imageUrl: true,
                  sourceUrl: true,
                },
              },
              trend: { select: { title: true } },
            },
          })
        : [];

    const seenInsightIds = new Set<string>();
    const insights: InsightCard[] = [];
    for (const link of insightLinks) {
      if (!seenInsightIds.has(link.insight.id)) {
        seenInsightIds.add(link.insight.id);
        insights.push({
          id: link.insight.id,
          title: link.insight.title,
          description: link.insight.description,
          imageUrl: link.insight.imageUrl,
          sourceUrl: link.insight.sourceUrl,
          trendTitle: link.trend.title,
        });
      }
    }

    return {
      sias,
      trends,
      technologies,
      insights,
      hasSiaLinks: true,
    };
  }

  /**
   * Get related trends for the idea submission sidebar.
   * Returns trends linked to the campaign's SIAs.
   */
  async getRelatedTrendsForCampaign(campaignId: string): Promise<TrendCard[]> {
    const content = await this.getBeInspiredContent(campaignId);
    return content.trends;
  }

  /**
   * Link an idea to a trend (one-click from submission sidebar).
   */
  async linkIdeaToTrend(ideaId: string, trendId: string): Promise<void> {
    await this.db.ideaTrendLink.upsert({
      where: {
        ideaId_trendId: { ideaId, trendId },
      },
      create: { ideaId, trendId },
      update: {},
    });
  }

  /**
   * Unlink an idea from a trend.
   */
  async unlinkIdeaTrend(ideaId: string, trendId: string): Promise<void> {
    await this.db.ideaTrendLink.delete({
      where: {
        ideaId_trendId: { ideaId, trendId },
      },
    });
  }

  /**
   * Check if a campaign has any SIA links (for conditional tab display).
   */
  async hasSiaLinks(campaignId: string): Promise<boolean> {
    const count = await this.db.campaignSiaLink.count({
      where: { campaignId },
    });
    return count > 0;
  }
}
