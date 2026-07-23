import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  createUser,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { ensureDatabase } from "@/lib/db";

const MAX_EMAIL = 254;
const MAX_PASSWORD = 128;
const MAX_NAME = 100;

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof name !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid input format" },
        { status: 400 }
      );
    }

    if (email.length > MAX_EMAIL) {
      return NextResponse.json(
        { error: "Email is too long" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (password.length > MAX_PASSWORD) {
      return NextResponse.json(
        { error: "Password must be at most 128 characters" },
        { status: 400 }
      );
    }

    if (name.length > MAX_NAME) {
      return NextResponse.json(
        { error: "Name is too long" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    await ensureDatabase();

    const existing = await findUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const user = await createUser(email.toLowerCase().trim(), password, name.trim());

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tokenVersion: 0,
    });

    await setSessionCookie(token);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 }
    );
  }
}
