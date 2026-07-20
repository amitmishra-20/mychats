import { NextResponse } from "next/server";
import { sql, ensureDatabase } from "@/lib/db";

export async function GET() {
  try {
    await ensureDatabase();
    const result = await sql`SELECT 1 as ok`;
    const dbOk = Array.isArray(result) && result.length > 0;

    return NextResponse.json({
      status: "ok",
      db: dbOk ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
