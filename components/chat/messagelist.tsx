"use client";

import { Message } from "@/types/chat";
import MessageBubble from "./messagebubble";
import { useCallback, useEffect, useRef } from "react";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2" aria-label="AI is typing">
      <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-accent animate-bounce" />
    </div>
  );
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isNearBottom]);

  return (
    <div
      ref={containerRef}
      className="flex-1 p-4 overflow-auto w-full"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
