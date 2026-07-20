"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";

interface MessageInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
  documentName: string | null;
}

export default function MessageInput({
  onSend,
  onStop,
  isLoading,
  documentName,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasText, setHasText] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
  }, [hasText]);

  // Return focus to textarea after streaming completes
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleSend = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return;
    onSend(text);
    textarea.value = "";
    textarea.style.height = "auto";
    setHasText(false);
    textarea.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder = documentName
    ? `Ask about ${documentName}...`
    : "Ask a question...";

  return (
    <div className="px-4 py-4 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 rounded-2xl bg-secondary p-2 border border-border">
          <textarea
            ref={textareaRef}
            rows={1}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              setHasText(e.target.value.trim().length > 0);
            }}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent p-2 outline-none text-foreground placeholder:text-muted-foreground text-sm leading-relaxed disabled:opacity-50"
            placeholder={placeholder}
          />
          <button
            onClick={isLoading ? onStop : handleSend}
            disabled={!isLoading && !hasText}
            className="p-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            aria-label={isLoading ? "Stop generating" : "Send message"}
          >
            {isLoading ? <Square size={16} fill="currentColor" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
