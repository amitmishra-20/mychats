import { Message } from "@/types/chat";
import ollama from "ollama";

export async function generateResponse(messages: Message[]) {
  const ollamaMessages = messages.map((message: Message) => ({
    role: message.role,
    content: message.content,
  }));
  const response = await ollama.chat({
    model: "llama3.2",
    messages: ollamaMessages,
    stream:true,
  });

   const encoder = new TextEncoder();

  const readableStream =
    new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          controller.enqueue(
            encoder.encode(
              chunk.message.content
            )
          );
        }

        controller.close();
      },
    });

  return readableStream;
}
