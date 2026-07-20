import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const RATE_LIMITS = {
  chat: { max: 20, windowMs: 60 * 60 * 1000 },
  upload: { max: 5, windowMs: 24 * 60 * 60 * 1000 },
} as const;

type RateLimitAction = keyof typeof RATE_LIMITS;

interface SessionEntry {
  uploads: number;
  chats: number;
  chatWindowStart: number;
  uploadWindowStart: number;
}

const store = new Map<string, SessionEntry>();

function getOrCreateSession(): string {
  return randomUUID();
}

function getEntry(sessionId: string): SessionEntry {
  const now = Date.now();
  let entry = store.get(sessionId);

  if (!entry) {
    entry = {
      uploads: 0,
      chats: 0,
      chatWindowStart: now,
      uploadWindowStart: now,
    };
    store.set(sessionId, entry);
  }

  if (now - entry.chatWindowStart > RATE_LIMITS.chat.windowMs) {
    entry.chats = 0;
    entry.chatWindowStart = now;
  }

  if (now - entry.uploadWindowStart > RATE_LIMITS.upload.windowMs) {
    entry.uploads = 0;
    entry.uploadWindowStart = now;
  }

  return entry;
}

export async function checkRateLimit(
  action: RateLimitAction
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("rl_session")?.value;

  if (!sessionId) {
    sessionId = getOrCreateSession();
    cookieStore.set("rl_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  }

  const entry = getEntry(sessionId);
  const limit = RATE_LIMITS[action];

  const windowStart =
    action === "chat" ? entry.chatWindowStart : entry.uploadWindowStart;
  const remaining = limit.max - (action === "chat" ? entry.chats : entry.uploads);
  const resetMs = Math.max(0, limit.windowMs - (Date.now() - windowStart));

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, resetMs };
  }

  if (action === "chat") entry.chats++;
  else entry.uploads++;

  return {
    allowed: true,
    remaining: remaining - 1,
    resetMs,
  };
}
