import { NextResponse } from "next/server";
import {
  findUserByEmail,
  createUser,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { ensureDatabase } from "@/lib/db";

const DEMO_EMAIL = "demo@demo.com";
const DEMO_NAME = "Demo User";

export async function GET() {
  return NextResponse.json({ available: true });
}

export async function POST() {
  try {
    await ensureDatabase();

    let user = await findUserByEmail(DEMO_EMAIL);

    if (!user) {
      user = await createUser(DEMO_EMAIL, "demo1234", DEMO_NAME);
    }

    const token = await createSessionToken({
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: "user",
      tokenVersion: 0,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "user",
      },
    });
  } catch (error) {
    console.error("Dummy login failed:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
