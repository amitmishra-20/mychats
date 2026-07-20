import { openai } from "@/lib/openai-client";
import { withRetry } from "@/lib/retry";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 2048;

/**
 * Convert a text string into a vector (list of 768 numbers).
 */
export async function embedText(text: string): Promise<number[]> {
  const result = await withRetry(() =>
    openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    })
  );

  const embedding = result.data[0]?.embedding;
  if (!embedding || embedding.length === 0) {
    throw new Error("Embedding API returned empty result");
  }

  return embedding;
}

/**
 * Embed multiple texts in batches via the embedding API.
 * The OpenAI API supports up to 2048 inputs per call.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const result = await withRetry(() =>
      openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      })
    );

    // Sort by index to maintain order
    const sorted = result.data.sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      if (!item.embedding || item.embedding.length === 0) {
        throw new Error(`Embedding API returned empty result for batch item ${item.index}`);
      }
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}
