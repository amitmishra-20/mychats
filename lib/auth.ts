import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sql } from "./db";

const SESSION_COOKIE = "session_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tokenVersion?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tv: user.tokenVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    // Check if token has been revoked by comparing token_version
    const tv = payload.tv as number | undefined;
    if (tv !== undefined) {
      const result = await sql`
        SELECT token_version FROM users WHERE id = ${payload.id as string} LIMIT 1
      `;
      if (result.length > 0 && (result[0].token_version as number) !== tv) {
        return null; // Token revoked
      }
    }

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      tokenVersion: tv,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * Invalidate all sessions for a user by incrementing their token_version.
 */
export async function invalidateUserSessions(userId: string) {
  await sql`
    UPDATE users SET token_version = token_version + 1 WHERE id = ${userId}
  `;
}

export async function findUserByEmail(email: string) {
  const results = await sql`
    SELECT id, email, password_hash, name, role, token_version, created_at
    FROM users WHERE email = ${email} LIMIT 1
  `;
  return results.length > 0 ? results[0] : null;
}

export async function createUser(
  email: string,
  password: string,
  name: string
) {
  const { v4: uuid } = await import("uuid");
  const id = uuid();
  const passwordHash = await hashPassword(password);
  await sql`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (${id}, ${email}, ${passwordHash}, ${name}, 'user')
  `;
  return { id, email, name, role: "user" };
}
