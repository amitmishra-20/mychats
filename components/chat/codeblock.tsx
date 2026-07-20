"use client";

import { CodeBlockProps } from "@/types/chat";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function CodeBlock({
  language,
  code,
  children,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-lg my-2">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-muted text-muted-foreground">
        <span>{language}</span>

        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {children}
    </div>
  );
}
