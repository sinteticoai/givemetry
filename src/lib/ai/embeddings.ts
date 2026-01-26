// T158: OpenAI embeddings client
import OpenAI from "openai";

export const EMBEDDING_MODELS = {
  TEXT_SMALL: "text-embedding-3-small",
  TEXT_LARGE: "text-embedding-3-large",
} as const;

export type EmbeddingModel = (typeof EMBEDDING_MODELS)[keyof typeof EMBEDDING_MODELS];

export interface EmbeddingOptions {
  apiKey: string;
  text: string | string[];
  model?: EmbeddingModel;
  dimensions?: number;
}

export interface EmbeddingResult {
  embeddings: number[][];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface SimilaritySearchOptions {
  queryEmbedding: number[];
  candidates: Array<{
    id: string;
    embedding: number[];
    [key: string]: unknown;
  }>;
  topK?: number;
  threshold?: number;
}

export interface SimilarityResult {
  id: string;
  score: number;
  [key: string]: unknown;
}

let openaiClient: OpenAI | null = null;

export function createEmbeddingsClient(apiKey: string): OpenAI {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }
  return new OpenAI({ apiKey });
}

function getClient(apiKey: string): OpenAI {
  if (!openaiClient) {
    openaiClient = createEmbeddingsClient(apiKey);
  }
  return openaiClient;
}

export async function generateEmbeddings(
  options: EmbeddingOptions
): Promise<EmbeddingResult> {
  const {
    apiKey,
    text,
    model = EMBEDDING_MODELS.TEXT_SMALL,
    dimensions,
  } = options;

  const client = getClient(apiKey);

  const input = Array.isArray(text) ? text : [text];

  const response = await client.embeddings.create({
    model,
    input,
    ...(dimensions && { dimensions }),
  });

  const embeddings = response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);

  return {
    embeddings,
    usage: {
      promptTokens: response.usage.prompt_tokens,
      totalTokens: response.usage.total_tokens,
    },
    model: response.model,
  };
}

export async function generateSingleEmbedding(
  options: Omit<EmbeddingOptions, "text"> & { text: string }
): Promise<number[]> {
  const result = await generateEmbeddings(options);
  return result.embeddings[0] || [];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function findSimilar(options: SimilaritySearchOptions): SimilarityResult[] {
  const { queryEmbedding, candidates, topK = 10, threshold = 0 } = options;

  const scored = candidates.map((candidate) => ({
    ...candidate,
    score: cosineSimilarity(queryEmbedding, candidate.embedding),
  }));

  return scored
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function semanticSearch(options: {
  apiKey: string;
  query: string;
  candidates: Array<{
    id: string;
    text: string;
    embedding?: number[];
    [key: string]: unknown;
  }>;
  topK?: number;
  threshold?: number;
  model?: EmbeddingModel;
}): Promise<SimilarityResult[]> {
  const { apiKey, query, candidates, topK = 10, threshold = 0.5, model } = options;

  // Generate embedding for query
  const queryEmbedding = await generateSingleEmbedding({
    apiKey,
    text: query,
    model,
  });

  // Generate embeddings for candidates that don't have them
  const candidatesNeedingEmbeddings = candidates.filter((c) => !c.embedding);
  let allCandidates = [...candidates];

  if (candidatesNeedingEmbeddings.length > 0) {
    const texts = candidatesNeedingEmbeddings.map((c) => c.text);
    const result = await generateEmbeddings({
      apiKey,
      text: texts,
      model,
    });

    // Merge embeddings back into candidates
    allCandidates = candidates.map((c) => {
      if (c.embedding) return c;
      const idx = candidatesNeedingEmbeddings.findIndex((cn) => cn.id === c.id);
      return { ...c, embedding: result.embeddings[idx] };
    });
  }

  return findSimilar({
    queryEmbedding,
    candidates: allCandidates.map((c) => ({
      ...c,
      embedding: c.embedding!,
    })),
    topK,
    threshold,
  });
}

export function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return embedding;
  return embedding.map((val) => val / norm);
}

export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error("Cannot average empty embeddings array");
  }

  const firstEmbedding = embeddings[0];
  if (!firstEmbedding) {
    throw new Error("First embedding is undefined");
  }

  const dimensions = firstEmbedding.length;
  const result = new Array(dimensions).fill(0) as number[];

  for (const embedding of embeddings) {
    for (let i = 0; i < dimensions; i++) {
      result[i] = (result[i] ?? 0) + (embedding[i] ?? 0);
    }
  }

  return result.map((val) => val / embeddings.length);
}
