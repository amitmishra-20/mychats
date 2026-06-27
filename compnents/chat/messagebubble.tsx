import { Message } from "@/types/chat";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeBlock from "./codeblock";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`max-w-prose w-max rounded-xl p-3 ${
        isUser ? "bg-yellow-400 text-neutral-900 ml-auto" : "bg-gray-200 text-neutral-900"
      }`}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props;

            const match = /language-(\w+)/.exec(className || "");
            const code= String(children).replace(/\n$/, "")
            return match ? (
              <CodeBlock language={match[1]} code={code}>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                >
                  {code}
                </SyntaxHighlighter>
              </CodeBlock>
            ) : (
              <code className={className}>{children}</code>
            );
          },
        }}
      >
        {message.content}
      </Markdown>
    </div>
  );
}
