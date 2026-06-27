import { Message } from "@/types/chat";
import MessageBubble from "./messagebubble";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}
export default function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-auto w-full">
      
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && (
        <span>Typing.....</span>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
