import { Message } from "@/types/chat";
import { openai } from "@/lib/openai-client";
import { withRetry } from "@/lib/retry";
import type OpenAI from "openai";

const CHAT_MODEL = "openrouter/free";
const STREAM_TIMEOUT_MS = 60_000;

/**
 * Generate a streaming chat response using OpenRouter.
 */
export async function generateResponse(
  messages: Message[],
  context?: string
) {
  const systemMessage = context
    ? [
        "You are a helpful assistant. Answer ONLY based on the following context.",
        "If the answer is not in the context, say: \"I don't have information about that in the provided documents.\"",
        "Do not use any knowledge outside the provided context.",
        "",
        "Context:",
        context,
      ].join("\n")
    : "You are a helpful assistant.";

  const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemMessage },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: chatMessages,
      stream: true,
    })
  );

  let timeoutId: ReturnType<typeof setTimeout>;

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      timeoutId = setTimeout(() => {
        controller.error(new Error("Stream timed out"));
      }, STREAM_TIMEOUT_MS);

      try {
        for await (const chunk of response) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            controller.error(new Error("Stream timed out"));
          }, STREAM_TIMEOUT_MS);

          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      } finally {
        clearTimeout(timeoutId);
      }

      controller.close();
    },
  });

  return readableStream;
}
