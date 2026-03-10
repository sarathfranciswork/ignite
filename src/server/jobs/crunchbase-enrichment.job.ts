import { logger } from "../lib/logger";
import { enrichAllCrunchbaseOrganizations } from "../services/partner.service";

export const CRUNCHBASE_ENRICHMENT_JOB_NAME = "crunchbase-enrichment";
export const CRUNCHBASE_ENRICHMENT_CRON = "0 3 * * 1"; // Every Monday at 3 AM

export interface CrunchbaseEnrichmentJobResult {
  total: number;
  enriched: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export async function processCrunchbaseEnrichment(): Promise<CrunchbaseEnrichmentJobResult> {
  const startTime = Date.now();

  logger.info("Starting Crunchbase enrichment job");

  const result = await enrichAllCrunchbaseOrganizations();
  const durationMs = Date.now() - startTime;

  logger.info("Crunchbase enrichment job completed", {
    ...result,
    durationMs,
  });

  return { ...result, durationMs };
}
