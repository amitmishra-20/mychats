import { generateResponse } from "@/services/ai";
import { embedText } from "@/services/embeddings";
import { searchChunks, ensureDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { Message } from "@/types/chat";

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_MESSAGES = 50;

function validateMessages(messages: unknown): messages is Message[] {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  if (messages.length > MAX_MESSAGES) return false;
  return messages.every(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      typeof (m as Message).id === "string" &&
      (m as Message).id.length > 0 &&
      (m as Message).id.length <= 200 &&
      typeof (m as Message).content === "string" &&
      (m as Message).content.length > 0 &&
      (m as Message).content.length <= MAX_MESSAGE_LENGTH &&
      ["user", "assistant"].includes((m as Message).role)
  );
}

export async function POST(req: Request) {
  try {
    const rateLimit = await checkRateLimit("chat");
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil(rateLimit.resetMs / 1000);
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    const { messages, documentId } = await req.json();

    if (!validateMessages(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    if (documentId !== undefined && documentId !== null) {
      if (typeof documentId !== "string" || documentId.length === 0 || documentId.length > 200) {
        return NextResponse.json(
          { error: "Invalid documentId format" },
          { status: 400 }
        );
      }
    }

    await ensureDatabase();

    let context: string | undefined;

    if (documentId) {
      const lastUserMessage = messages[messages.length - 1]?.content || "";

      if (lastUserMessage) {
        const queryEmbedding = await embedText(lastUserMessage);
        const results = await searchChunks(queryEmbedding, documentId, 3);

        if (results.length > 0) {
          context = results
            .map((r: Record<string, unknown>) => r.content as string)
            .join("\n\n---\n\n");
        }
      }
    }

    const response = await generateResponse(messages, context);

    return new Response(response, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
