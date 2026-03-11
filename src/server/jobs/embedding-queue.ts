import { logger } from "@/server/lib/logger";
import { processEmbeddingJob, type EmbeddingJobPayload } from "./embedding.job";

const childLogger = logger.child({ service: "embedding-queue" });

/**
 * Embedding queue abstraction.
 *
 * When BullMQ + Redis is available, this will dispatch jobs to a BullMQ queue.
 * For now, jobs are processed in-process asynchronously (fire-and-forget).
 *
 * The interface is stable — switching to BullMQ only changes the internals.
 */
export function enqueueEmbedding(payload: EmbeddingJobPayload): void {
  void processEmbeddingJob(payload).catch((error) => {
    childLogger.error({ ideaId: payload.ideaId, error }, "Failed to process embedding job");
  });
}
