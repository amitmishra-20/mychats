import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

const noStoreHeaders = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null }, { headers: noStoreHeaders });
    }
    return NextResponse.json({ user }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json({ user: null }, { headers: noStoreHeaders });
  }
}
