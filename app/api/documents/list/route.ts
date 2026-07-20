import { sql, ensureDatabase } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await ensureDatabase();
    const docs = await sql`
      SELECT DISTINCT ON (d.document_id)
        d.document_id,
        d.file_name,
        d.total_chunks,
        d.created_at as uploaded_at
      FROM documents d
      INNER JOIN (
        SELECT document_id, COUNT(*) as actual_chunks
        FROM documents
        GROUP BY document_id
        HAVING COUNT(*) > 0
      ) c ON d.document_id = c.document_id AND c.actual_chunks = d.total_chunks
      ORDER BY d.document_id, d.created_at DESC
    `;
    return NextResponse.json(docs);
  } catch (error) {
    console.error("Failed to list documents:", error);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 }
    );
  }
}
