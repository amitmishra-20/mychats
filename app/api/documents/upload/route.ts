import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, chunkText } from "@/lib/pdf-parser";
import { embedTexts } from "@/services/embeddings";
import { sql, ensureDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { v4 as uuid } from "uuid";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_CHUNKS = 500;
const MAX_FILE_NAME = 255;

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documentId = uuid();
  let chunksInserted = 0;

  try {
    const rateLimit = await checkRateLimit("upload");
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil(rateLimit.resetMs / 1000);
      return NextResponse.json(
        {
          error: `Upload limit reached. Try again in ${Math.ceil(retryAfter / 60)} hours.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    await ensureDatabase();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Please upload a valid PDF file" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    const fileName = file.name
      .replace(/\0/g, "")
      .slice(0, MAX_FILE_NAME);

    const buffer = await file.arrayBuffer();
    const pages = await extractTextFromPDF(buffer);
    const fullText = pages.join("\n\n");

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: "No text found in the PDF. The file might be image-based." },
        { status: 400 }
      );
    }

    const chunks = chunkText(fullText);

    if (chunks.length > MAX_CHUNKS) {
      return NextResponse.json(
        {
          error: `Document too large: ${chunks.length} chunks (maximum ${MAX_CHUNKS}). Try a shorter document.`,
        },
        { status: 400 }
      );
    }

    const embeddings = await embedTexts(chunks);

    // Batch insert: process in groups of 50
    const BATCH_SIZE = 50;
    for (let batch = 0; batch < chunks.length; batch += BATCH_SIZE) {
      const batchChunks = chunks.slice(batch, batch + BATCH_SIZE);
      const batchEmbeddings = embeddings.slice(batch, batch + BATCH_SIZE);

      const values = batchChunks.map((chunk, i) => ({
        id: `${documentId}-chunk-${batch + i}`,
        content: chunk,
        embedding: JSON.stringify(batchEmbeddings[i]),
        document_id: documentId,
        file_name: fileName,
        chunk_index: batch + i,
        total_chunks: chunks.length,
        user_id: user!.id,
        is_shared: false,
      }));

      // Build multi-row insert
      for (const v of values) {
        await sql`
          INSERT INTO documents (id, content, embedding, document_id, file_name, chunk_index, total_chunks, user_id, is_shared)
          VALUES (
            ${v.id},
            ${v.content},
            ${v.embedding}::vector,
            ${v.document_id},
            ${v.file_name},
            ${v.chunk_index},
            ${v.total_chunks},
            ${v.user_id},
            ${v.is_shared}
          )
        `;
        chunksInserted++;
      }
    }

    return NextResponse.json({
      documentId,
      fileName,
      chunks: chunks.length,
      pages: pages.length,
    });
  } catch (error) {
    // Cleanup orphaned chunks on failure — always clean up if any chunks were inserted
    if (chunksInserted > 0) {
      try {
        await sql`DELETE FROM documents WHERE document_id = ${documentId}`;
      } catch {
        // best-effort cleanup
      }
    }

    console.error("Document upload failed:", error);
    return NextResponse.json(
      { error: "Failed to process document. Please try again." },
      { status: 500 }
    );
  }
}
