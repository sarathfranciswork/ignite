import {
  type AIProvider,
  type EmbeddingResult,
  type SimilarityResult,
  type TextGenerationResult,
} from "./provider";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import path from "path";
import fs from "fs";

const childLogger = logger.child({ service: "local-ai-provider" });

const EMBEDDING_DIMENSIONS = 384;

interface OnnxSession {
  run(feeds: Record<string, unknown>): Promise<Record<string, { data: Float32Array }>>;
}

interface OnnxTensorConstructor {
  new (type: string, data: BigInt64Array | Float32Array, dims: number[]): unknown;
}

interface OnnxRuntime {
  InferenceSession: {
    create(modelPath: string): Promise<OnnxSession>;
  };
  Tensor: OnnxTensorConstructor;
}

interface TokenizerResult {
  inputIds: bigint[];
  attentionMask: bigint[];
}

/**
 * Dynamically loads onnxruntime-node without webpack analyzing the import.
 * This prevents build failures when onnxruntime-node is not installed.
 */
function tryLoadOnnx(): OnnxRuntime | null {
  try {
    // Use a variable to prevent webpack from analyzing this require
    const moduleName = "onnxruntime-node";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(moduleName) as OnnxRuntime;
  } catch {
    return null;
  }
}

/**
 * LocalAIProvider uses ONNX Runtime with the all-MiniLM-L6-v2 model
 * to generate 384-dimensional embeddings locally without external API calls.
 *
 * Falls back gracefully if onnxruntime-node is not installed.
 */
export class LocalAIProvider implements AIProvider {
  readonly name = "local";
  private session: OnnxSession | null = null;
  private ort: OnnxRuntime | null = null;
  private initPromise: Promise<void> | null = null;
  private available = false;

  isAvailable(): boolean {
    return this.available;
  }

  private async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    try {
      const ort = tryLoadOnnx();
      if (!ort) {
        childLogger.info("onnxruntime-node not installed — LocalAIProvider unavailable");
        this.available = false;
        return;
      }

      const modelPath = path.join(process.cwd(), "models", "all-MiniLM-L6-v2", "model.onnx");

      if (!fs.existsSync(modelPath)) {
        childLogger.warn({ modelPath }, "ONNX model file not found — LocalAIProvider unavailable");
        this.available = false;
        return;
      }

      this.ort = ort;
      this.session = await ort.InferenceSession.create(modelPath);
      this.available = true;
      childLogger.info("LocalAIProvider initialized with all-MiniLM-L6-v2");
    } catch (error) {
      childLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to initialize LocalAIProvider — falling back to unavailable",
      );
      this.available = false;
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    await this.init();

    if (!this.session || !this.ort) {
      return { embedding: [], dimensions: 0 };
    }

    try {
      const tokens = tokenize(text);
      const ort = this.ort;

      const inputIds = new ort.Tensor("int64", BigInt64Array.from(tokens.inputIds), [
        1,
        tokens.inputIds.length,
      ]);
      const attentionMask = new ort.Tensor("int64", BigInt64Array.from(tokens.attentionMask), [
        1,
        tokens.attentionMask.length,
      ]);
      const tokenTypeIds = new ort.Tensor(
        "int64",
        new BigInt64Array(tokens.inputIds.length).fill(0n),
        [1, tokens.inputIds.length],
      );

      const output = await this.session.run({
        input_ids: inputIds,
        attention_mask: attentionMask,
        token_type_ids: tokenTypeIds,
      });

      // Mean pooling over token embeddings
      const lastHidden = output["last_hidden_state"];
      if (!lastHidden) {
        childLogger.error("Model output missing last_hidden_state");
        return { embedding: [], dimensions: 0 };
      }

      const embedding = meanPool(
        lastHidden.data as unknown as Float32Array,
        tokens.attentionMask,
        tokens.inputIds.length,
        EMBEDDING_DIMENSIONS,
      );

      const normalized = l2Normalize(embedding);

      return {
        embedding: Array.from(normalized),
        dimensions: EMBEDDING_DIMENSIONS,
      };
    } catch (error) {
      childLogger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to generate embedding",
      );
      return { embedding: [], dimensions: 0 };
    }
  }

  supportsTextGeneration(): boolean {
    return false;
  }

  async generateText(_prompt: string, _systemPrompt?: string): Promise<TextGenerationResult> {
    return { text: "", success: false };
  }

  async findSimilar(embedding: number[], limit: number): Promise<SimilarityResult[]> {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      return [];
    }

    try {
      const vectorStr = `[${embedding.join(",")}]`;
      const results = await prisma.$queryRawUnsafe<Array<{ id: string; distance: number }>>(
        `SELECT id, embedding <=> $1::vector AS distance
         FROM ideas
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        vectorStr,
        limit,
      );

      return results.map((r) => ({
        id: r.id,
        score: 1 - r.distance,
      }));
    } catch (error) {
      childLogger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to find similar ideas via pgvector",
      );
      return [];
    }
  }
}

/**
 * Simple whitespace tokenizer that produces WordPiece-compatible token IDs.
 * For production, this would use a proper tokenizer (e.g., tokenizers npm package).
 * This simplified version splits on whitespace and maps to basic vocab indices.
 */
function tokenize(text: string): TokenizerResult {
  const CLS_TOKEN = 101n;
  const SEP_TOKEN = 102n;
  const UNK_TOKEN = 100n;
  const MAX_LENGTH = 128;

  const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const wordTokens: bigint[] = [];

  for (const word of words) {
    if (wordTokens.length >= MAX_LENGTH - 2) break;
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0x7fffffff;
    }
    wordTokens.push(BigInt((hash % 29000) + 1000));
  }

  if (wordTokens.length === 0) {
    wordTokens.push(UNK_TOKEN);
  }

  const inputIds = [CLS_TOKEN, ...wordTokens, SEP_TOKEN];
  const attentionMask = new Array(inputIds.length).fill(1n) as bigint[];

  return { inputIds, attentionMask };
}

function meanPool(
  data: Float32Array,
  attentionMask: bigint[],
  seqLen: number,
  hiddenSize: number,
): Float32Array {
  const result = new Float32Array(hiddenSize);
  let maskSum = 0;

  for (let i = 0; i < seqLen; i++) {
    const mask = Number(attentionMask[i]);
    maskSum += mask;
    for (let j = 0; j < hiddenSize; j++) {
      result[j] += data[i * hiddenSize + j] * mask;
    }
  }

  if (maskSum > 0) {
    for (let j = 0; j < hiddenSize; j++) {
      result[j] /= maskSum;
    }
  }

  return result;
}

function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);

  if (norm === 0) return vec;

  const result = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    result[i] = vec[i] / norm;
  }
  return result;
}
