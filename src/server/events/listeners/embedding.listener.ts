import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { prisma } from "@/server/lib/prisma";
import { enqueueEmbedding } from "@/server/jobs/embedding-queue";
import { buildEmbeddingText } from "@/server/jobs/embedding.job";
import { aiProvider } from "@/server/lib/ai/factory";

const childLogger = logger.child({ service: "embedding-listener" });

const globalForListeners = globalThis as unknown as {
  embeddingListenersRegistered: boolean | undefined;
};

/**
 * Register event listeners that trigger embedding generation
 * when ideas are submitted or updated.
 *
 * Embeddings are generated asynchronously via the embedding queue.
 * If AI is not available, events are silently ignored.
 */
export function registerEmbeddingListeners(): void {
  if (globalForListeners.embeddingListenersRegistered) return;
  globalForListeners.embeddingListenersRegistered = true;

  // Generate embedding when an idea is submitted
  eventBus.on("idea.submitted", (payload) => {
    void handleIdeaEmbedding(payload.entityId, "submitted");
  });

  // Regenerate embedding when an idea is updated
  eventBus.on("idea.updated", (payload) => {
    void handleIdeaEmbedding(payload.entityId, "updated");
  });

  childLogger.info("Embedding event listeners registered");
}

async function handleIdeaEmbedding(ideaId: string, trigger: string): Promise<void> {
  if (!aiProvider.isAvailable()) {
    return;
  }

  try {
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: {
        id: true,
        title: true,
        teaser: true,
        description: true,
        tags: true,
        category: true,
      },
    });

    if (!idea) {
      childLogger.warn({ ideaId, trigger }, "Idea not found for embedding generation");
      return;
    }

    const text = buildEmbeddingText(idea);

    enqueueEmbedding({ ideaId: idea.id, text });

    childLogger.debug({ ideaId, trigger }, "Embedding job enqueued");
  } catch (error) {
    childLogger.error(
      {
        ideaId,
        trigger,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to enqueue embedding job",
    );
  }
}
