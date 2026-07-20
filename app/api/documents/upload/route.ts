import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, chunkText } from "@/lib/pdf-parser";
import { embedTexts } from "@/services/embeddings";
import { sql, ensureDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { v4 as uuid } from "uuid";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_CHUNKS = 500;

export async function POST(req: NextRequest) {
  const documentId = uuid();
  let chunksInserted = false;

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

    // Batch embed all chunks in one API call (OpenAI supports up to 2048 inputs)
    const embeddings = await embedTexts(chunks);

    // Insert all chunks
    for (let i = 0; i < chunks.length; i++) {
      await sql`
        INSERT INTO documents (id, content, embedding, document_id, file_name, chunk_index, total_chunks)
        VALUES (
          ${`${documentId}-chunk-${i}`},
          ${chunks[i]},
          ${JSON.stringify(embeddings[i])}::vector,
          ${documentId},
          ${file.name},
          ${i},
          ${chunks.length}
        )
      `;
    }
    chunksInserted = true;

    return NextResponse.json({
      documentId,
      fileName: file.name,
      chunks: chunks.length,
      pages: pages.length,
    });
  } catch (error) {
    // Cleanup orphaned chunks on failure
    if (chunksInserted) {
      try {
        await sql`DELETE FROM documents WHERE document_id = ${documentId}`;
      } catch {
        // best-effort cleanup
      }
    } else {
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
