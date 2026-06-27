"use client";

import { useRef, useState } from "react";
import { Message } from "@/types/chat";
import MessageInput from "./messageinput";
import MessageList from "./messagelist";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";

export default function ChatWindow() {
   const words = [{text:"what's"},{text:"on"},{text:"your"},{text:"mind"},{text:"today?" ,  className:"text-yellow-400 dark:text-yellow-400"}];
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (
    upDatedMeassages: Message[],
    signal: AbortSignal,
  ) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: upDatedMeassages,
      }),
      signal,
    });
    return response;
  };
  const handleSend = async (text: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isLoading) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const updatedMessages = [...messages, newMessage];

    setMessages(updatedMessages.slice(-20));
    setIsLoading(true);
    const result = await sendMessage(updatedMessages, controller.signal);
    const aiMessageId = crypto.randomUUID();
    try {
      const reader = result.body?.getReader();
      const decoder = new TextDecoder();

      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      while (true) {
        const { done, value } = await reader!.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const next = [...prev];

          const index = next.findIndex((m) => m.id === aiMessageId);

          if (index !== -1) {
            next[index] = {
              ...next[index],
              content: next[index].content + chunk,
            };
          }

          return next;
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) => {
          const next = [...prev];

          const index = next.findIndex((m) => m.id === aiMessageId);

          if (index !== -1) {
            next[index] = {
              ...next[index],
              content: next[index].content + "\n\n Generation stoped",
            };
          }

          return next;
        });

        return;
      }

      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };
  return (
    <section className="flex-1 flex flex-col overflow-hidden justify-center items-center bg-neutral-900 m-2.5 rounded-lg">
      {messages.length===0?
      <TypewriterEffect className="text-6xl text-center mb-5 " words={words} cursorClassName="bg-yellow-400 dark:bg-yellow-400" />:
      <MessageList messages={messages} isLoading={isLoading} />
      }
      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        isLoading={isLoading}
      />
    </section>
  );
}
