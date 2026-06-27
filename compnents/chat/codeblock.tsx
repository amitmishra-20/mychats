"use client";

import { CodeBlockProps } from "@/types/chat";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CodeBlock({
  language,
  code,
  children,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="overflow-hidden rounded-lg">
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <span>{language}</span>

        <button
          onClick={handleCopy}
          className="cursor-pointer"
        >
          {copied ? <Check size={16}/> : <Copy size={16}/>}
        </button>
      </div>

      {children}
    </div>
  );
}