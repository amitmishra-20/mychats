import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { ensureDatabase } from "@/lib/db";

const MAX_EMAIL = 254;
const MAX_PASSWORD = 128;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string") {
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

    if (password.length > MAX_PASSWORD) {
      return NextResponse.json(
        { error: "Password is too long" },
        { status: 400 }
      );
    }

    await ensureDatabase();

    const user = await findUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: user.role as string,
      tokenVersion: user.token_version as number,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
