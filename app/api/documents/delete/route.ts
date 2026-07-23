import { sql, ensureDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await req.json();

    if (!documentId || typeof documentId !== "string" || documentId.length > 200) {
      return NextResponse.json(
        { error: "Valid documentId is required" },
        { status: 400 }
      );
    }

    await ensureDatabase();

    const ownership = await sql`
      SELECT document_id FROM documents
      WHERE document_id = ${documentId} AND user_id = ${user.id}
      LIMIT 1
    `;
    if (ownership.length === 0) {
      return NextResponse.json(
        { error: "You can only delete your own documents" },
        { status: 403 }
      );
    }

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
