import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../lib/redis";
import { sendEmail } from "../lib/mailer";
import { logger } from "../lib/logger";
import { EMAIL_QUEUE_NAME } from "./queues";
import type { EmailJobPayload } from "../events/types";

async function processEmailJob(job: Job<EmailJobPayload>): Promise<void> {
  const { to, subject, html, notificationId } = job.data;

  logger.info("Processing email job", {
    jobId: job.id,
    notificationId,
    to,
    subject,
  });

  await sendEmail({ to, subject, html });

  logger.info("Email sent successfully", {
    jobId: job.id,
    notificationId,
    to,
  });
}

export function createEmailWorker(): Worker<EmailJobPayload> {
  const worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    processEmailJob,
    {
      connection: getRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 50,
        duration: 60000,
      },
    },
  );

  worker.on("failed", (job, error) => {
    logger.error("Email job failed", {
      jobId: job?.id,
      notificationId: job?.data.notificationId,
      to: job?.data.to,
      error: error.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on("completed", (job) => {
    logger.debug("Email job completed", {
      jobId: job.id,
      notificationId: job.data.notificationId,
    });
  });

  return worker;
}
