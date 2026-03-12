import { logger } from "@/server/lib/logger";
import { isEmailEnabled } from "@/server/lib/email";
import { startDigestScheduler } from "@/server/jobs/email-queue";

const childLogger = logger.child({ service: "jobs-init" });

const globalForInit = globalThis as unknown as {
  jobsInitialized: boolean | undefined;
};

/**
 * Initialize job schedulers (digest emails, etc.).
 * Only starts if SMTP is configured.
 * Safe to call multiple times — idempotent via global guard.
 */
export async function initializeJobWorkers(): Promise<void> {
  if (globalForInit.jobsInitialized) return;
  globalForInit.jobsInitialized = true;

  if (!isEmailEnabled()) {
    childLogger.info("SMTP not configured — skipping email job schedulers");
    return;
  }

  try {
    startDigestScheduler();
    childLogger.info("Job schedulers initialized successfully");
  } catch (error) {
    childLogger.error({ error }, "Failed to initialize job schedulers");
  }
}
