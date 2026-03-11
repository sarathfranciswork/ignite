import { logger } from "@/server/lib/logger";
import { processEmailJob, processDigestJob, type EmailJobPayload } from "./email.job";

const childLogger = logger.child({ service: "email-queue" });

/**
 * Email queue abstraction.
 *
 * When BullMQ + Redis is available, this will dispatch jobs to a BullMQ queue.
 * For now, jobs are processed in-process asynchronously (fire-and-forget).
 *
 * The interface is stable — switching to BullMQ only changes the internals
 * of enqueueEmail() and startDigestScheduler().
 */

export function enqueueEmail(payload: EmailJobPayload): void {
  // Fire-and-forget: process asynchronously without blocking the caller
  void processEmailJob(payload).catch((error) => {
    childLogger.error(
      { notificationId: payload.notificationId, userId: payload.userId, error },
      "Failed to process email job",
    );
  });
}

let dailyTimer: ReturnType<typeof setInterval> | null = null;
let weeklyTimer: ReturnType<typeof setInterval> | null = null;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

export function startDigestScheduler(): void {
  if (dailyTimer || weeklyTimer) {
    childLogger.warn("Digest scheduler already running");
    return;
  }

  // Daily digest — runs every 24 hours
  dailyTimer = setInterval(() => {
    void processDigestJob("DAILY").catch((error) => {
      childLogger.error({ error }, "Daily digest job failed");
    });
  }, ONE_DAY_MS);

  // Weekly digest — runs every 7 days
  weeklyTimer = setInterval(() => {
    void processDigestJob("WEEKLY").catch((error) => {
      childLogger.error({ error }, "Weekly digest job failed");
    });
  }, ONE_WEEK_MS);

  // Ensure timers don't prevent process exit
  if (dailyTimer && typeof dailyTimer === "object" && "unref" in dailyTimer) {
    dailyTimer.unref();
  }
  if (weeklyTimer && typeof weeklyTimer === "object" && "unref" in weeklyTimer) {
    weeklyTimer.unref();
  }

  childLogger.info("Digest scheduler started (daily + weekly)");
}

export function stopDigestScheduler(): void {
  if (dailyTimer) {
    clearInterval(dailyTimer);
    dailyTimer = null;
  }
  if (weeklyTimer) {
    clearInterval(weeklyTimer);
    weeklyTimer = null;
  }
  childLogger.info("Digest scheduler stopped");
}

/**
 * Run a digest job on-demand (useful for testing or manual triggers).
 */
export async function runDigestNow(
  frequency: "DAILY" | "WEEKLY",
): Promise<{ usersProcessed: number; emailsSent: number }> {
  return processDigestJob(frequency);
}
