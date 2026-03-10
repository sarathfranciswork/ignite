import { createEmailWorker } from "./jobs/email.job";
import { createDigestWorker, scheduleDigestJobs } from "./jobs/digest.job";
import { logger } from "./lib/logger";

async function main(): Promise<void> {
  logger.info("Starting worker process");

  const emailWorker = createEmailWorker();
  logger.info("Email worker started", { queue: "email" });

  const digestWorker = createDigestWorker();
  logger.info("Digest worker started", { queue: "digest" });

  await scheduleDigestJobs();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("Received shutdown signal", { signal });

    await Promise.all([emailWorker.close(), digestWorker.close()]);

    logger.info("Workers shut down gracefully");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  logger.info("Worker process ready");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("Worker process failed to start", { error: message });
  process.exit(1);
});
