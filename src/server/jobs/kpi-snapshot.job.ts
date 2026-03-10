import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { createKpiSnapshot } from "@/server/services/kpi.service";

const childLogger = logger.child({ service: "kpi-snapshot-job" });

/**
 * Daily KPI snapshot job processor.
 * Creates a snapshot for every active (non-DRAFT, non-CLOSED) campaign.
 *
 * Designed to be called by a BullMQ repeatable job on a daily cron schedule.
 * When BullMQ is not yet configured, this can be called directly from a cron endpoint.
 */
export async function processKpiSnapshots(): Promise<number> {
  const activeCampaigns = await prisma.campaign.findMany({
    where: {
      status: {
        notIn: ["DRAFT", "CLOSED"],
      },
    },
    select: { id: true, title: true },
  });

  if (activeCampaigns.length === 0) {
    childLogger.info("No active campaigns for KPI snapshot");
    return 0;
  }

  let processed = 0;

  for (const campaign of activeCampaigns) {
    try {
      await createKpiSnapshot(campaign.id);
      processed++;
    } catch (error) {
      childLogger.error(
        { campaignId: campaign.id, title: campaign.title, error },
        "Failed to create KPI snapshot",
      );
    }
  }

  childLogger.info({ total: activeCampaigns.length, processed }, "KPI snapshot job completed");

  return processed;
}
