import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(databaseUrl);

export { sql };

let dbReady = false;

/**
 * Ensure the database schema exists. Runs once per serverless instance.
 * Uses CREATE IF NOT EXISTS — idempotent and never drops data.
 */
export async function ensureDatabase() {
  if (dbReady) return;

  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding VECTOR(768) NOT NULL,
      document_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      total_chunks INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS documents_embedding_idx
    ON documents USING hnsw (embedding vector_cosine_ops)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS documents_document_id_idx
    ON documents (document_id)
  `;

  dbReady = true;
}

/**
 * Search for the most similar document chunks to a query vector.
 */
export async function searchChunks(
  embedding: number[],
  documentId: string,
  limit: number = 3
) {
  const embeddingJson = JSON.stringify(embedding);

  return sql`
    SELECT
      id,
      content,
      chunk_index,
      1 - (embedding <=> ${embeddingJson}::vector) AS similarity
    FROM documents
    WHERE document_id = ${documentId}
    ORDER BY embedding <=> ${embeddingJson}::vector
    LIMIT ${limit}
  `;
}
