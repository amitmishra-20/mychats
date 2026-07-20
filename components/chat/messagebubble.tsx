"use client";

import { memo, useMemo } from "react";
import { Message } from "@/types/chat";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

function formatTime(ts?: number) {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CodeHighlighter({ language, code }: { language: string; code: string }) {
  // Lazy-load the heavy syntax highlighter
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Prism, oneDark } = useMemo(() => require("react-syntax-highlighter"), []);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CodeBlock = useMemo(() => require("./codeblock").default, []);

  return (
    <CodeBlock language={language} code={code}>
      <Prism
        style={oneDark}
        language={language}
        PreTag="div"
      >
        {code}
      </Prism>
    </CodeBlock>
  );
}

function MessageBubbleInner({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const time = formatTime(message.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        aria-label={isUser ? "You" : "AI assistant"}
        role="img"
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
          isUser
            ? "bg-accent text-accent-foreground"
            : "bg-secondary text-secondary-foreground border border-border"
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div
        className={`max-w-[85%] lg:max-w-[70%] ${
          isUser ? "ml-auto text-right" : ""
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-3 inline-block text-left ${
            isUser
              ? "bg-accent/15 text-foreground border border-accent/20 rounded-br-md"
              : "bg-secondary text-secondary-foreground rounded-bl-md"
          }`}
        >
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              code(props) {
                const { children, className } = props;
                const match = /language-(\w+)/.exec(className || "");
                const code = String(children).replace(/\n$/, "");
                return match ? (
                  <CodeHighlighter language={match[1]} code={code} />
                ) : (
                  <code className="px-1.5 py-0.5 rounded bg-muted text-sm">{children}</code>
                );
              },
            }}
          >
            {message.content}
          </Markdown>
        </div>

        {time && (
          <p className="text-[10px] text-muted-foreground mt-1 px-1">
            {time}
          </p>
        )}
      </div>
    </motion.div>
  );
}

const MessageBubble = memo(MessageBubbleInner);
export default MessageBubble;
