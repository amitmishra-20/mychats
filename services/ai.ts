import { Message } from "@/types/chat";
import ollama from "ollama";

export async function generateResponse(messages: Message[]) {
  console.log("Received request");
  const ollamaMessages = messages.map((message: Message) => ({
    role: message.role,
    content: message.content,
  }));
  const response = await ollama.chat({
    model: "llama3.2",
    messages: ollamaMessages,
    stream: true,
    keep_alive: "10m",
    options: {
      temperature: 0.7,
      top_k: 50,
    },
  });

  
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(chunk.message.content));
      }

      controller.close();
    },
  });

  return readableStream;
}
