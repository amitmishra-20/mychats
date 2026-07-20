import { sql, ensureDatabase } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const { documentId } = await req.json();

    if (!documentId || typeof documentId !== "string" || documentId.length > 200) {
      return NextResponse.json(
        { error: "Valid documentId is required" },
        { status: 400 }
      );
    }

    await ensureDatabase();
    await sql`DELETE FROM documents WHERE document_id = ${documentId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
