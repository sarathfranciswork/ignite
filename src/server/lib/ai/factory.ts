import { type AIProvider } from "./provider";
import { NullAIProvider } from "./null.provider";
import { OpenAIProvider } from "./openai.provider";
import { LocalAIProvider } from "./local.provider";
import { logger } from "@/server/lib/logger";

function createProvider(): AIProvider {
  const aiEnabled = process.env.AI_ENABLED === "true";

  if (!aiEnabled) {
    logger.info("AI disabled — using NullAIProvider");
    return new NullAIProvider();
  }

  // Priority 1: OpenAI API key available -> use OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    logger.info("AI enabled with OpenAI API key — using OpenAIProvider");
    return new OpenAIProvider(openaiKey);
  }

  // Priority 2: Local ONNX model -> use LocalAIProvider
  // LocalAIProvider lazily checks for model availability on first use
  logger.info("AI enabled — using LocalAIProvider (ONNX Runtime)");
  return new LocalAIProvider();
}

const globalForAI = globalThis as unknown as {
  aiProvider: AIProvider | undefined;
};

export const aiProvider = globalForAI.aiProvider ?? createProvider();

if (process.env.NODE_ENV !== "production") {
  globalForAI.aiProvider = aiProvider;
}
