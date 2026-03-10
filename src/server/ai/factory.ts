import { type AIProvider } from "./provider";
import { NullAIProvider } from "./null.provider";

let instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (instance) return instance;

  // For Story 1.1, only NullAIProvider is available.
  // LocalAIProvider (ONNX) and OpenAIProvider will be added in later stories.
  instance = new NullAIProvider();

  return instance;
}
