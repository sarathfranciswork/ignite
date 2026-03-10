import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../lib/redis";
import { getDigestQueue, DIGEST_QUEUE_NAME } from "./queues";
import { buildAndQueueDigest } from "../services/digest.service";
import { logger } from "../lib/logger";
import { getEnv } from "../lib/env";
import type { DigestJobPayload } from "../events/types";

/**
 * Database access interface for digest processing.
 * In production, this is backed by Prisma. In tests, it can be mocked.
 */
export interface DigestRepository {
  getUsersWithFrequency(frequency: "DAILY" | "WEEKLY"): Promise<
    Array<{
      id: string;
      email: string;
      firstName: string;
      emailFrequency: "DAILY" | "WEEKLY";
    }>
  >;
  getUnemailedNotifications(
    userId: string,
    since: Date,
  ): Promise<
    Array<{
      id: string;
      type: string;
      title: string;
      body: string | null;
      link: string | null;
    }>
  >;
  markNotificationsAsEmailed(notificationIds: string[]): Promise<void>;
}

let repository: DigestRepository | undefined;

export function setDigestRepository(repo: DigestRepository): void {
  repository = repo;
}

function getDigestSince(frequency: "DAILY" | "WEEKLY"): Date {
  const now = new Date();
  if (frequency === "DAILY") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}

async function processDigestJob(job: Job<DigestJobPayload>): Promise<void> {
  const { frequency } = job.data;

  if (!repository) {
    throw new Error(
      "DigestRepository not configured. Call setDigestRepository() before processing digest jobs.",
    );
  }

  logger.info("Starting digest job", { frequency });

  const users = await repository.getUsersWithFrequency(frequency);
  logger.info("Found users for digest", {
    frequency,
    userCount: users.length,
  });

  const since = getDigestSince(frequency);
  let emailsSent = 0;

  for (const user of users) {
    const notifications = await repository.getUnemailedNotifications(
      user.id,
      since,
    );

    const queued = await buildAndQueueDigest(user, notifications);
    if (queued) {
      emailsSent++;
      const notificationIds = notifications.map((n) => n.id);
      await repository.markNotificationsAsEmailed(notificationIds);
    }
  }

  logger.info("Digest job completed", {
    frequency,
    usersProcessed: users.length,
    emailsQueued: emailsSent,
  });
}

export function createDigestWorker(): Worker<DigestJobPayload> {
  const worker = new Worker<DigestJobPayload>(
    DIGEST_QUEUE_NAME,
    processDigestJob,
    {
      connection: getRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on("failed", (job, error) => {
    logger.error("Digest job failed", {
      jobId: job?.id,
      frequency: job?.data.frequency,
      error: error.message,
    });
  });

  worker.on("completed", (job) => {
    logger.info("Digest job completed successfully", {
      jobId: job.id,
      frequency: job.data.frequency,
    });
  });

  return worker;
}

/**
 * Schedule repeatable digest jobs on the digest queue.
 * Daily: runs at DIGEST_DAILY_HOUR every day.
 * Weekly: runs at DIGEST_WEEKLY_HOUR on DIGEST_WEEKLY_DAY.
 */
export async function scheduleDigestJobs(): Promise<void> {
  const env = getEnv();
  const queue = getDigestQueue();

  // Daily digest cron
  await queue.upsertJobScheduler(
    "daily-digest",
    {
      pattern: `0 ${env.DIGEST_DAILY_HOUR} * * *`,
    },
    {
      name: "process-digest",
      data: { frequency: "DAILY" as const },
    },
  );

  // Weekly digest cron
  await queue.upsertJobScheduler(
    "weekly-digest",
    {
      pattern: `0 ${env.DIGEST_WEEKLY_HOUR} * * ${env.DIGEST_WEEKLY_DAY}`,
    },
    {
      name: "process-digest",
      data: { frequency: "WEEKLY" as const },
    },
  );

  logger.info("Digest jobs scheduled", {
    dailyHour: env.DIGEST_DAILY_HOUR,
    weeklyDay: env.DIGEST_WEEKLY_DAY,
    weeklyHour: env.DIGEST_WEEKLY_HOUR,
  });
}
