"use client";

import { FileText } from "lucide-react";
import FileUpload from "../documents/fileupload";

interface EmptyStateProps {
  documentName: string | null;
  onSuggestionClick: (text: string) => void;
  onUploaded?: (documentId?: string) => void;
}

const suggestions = [
  "Summarize this document",
  "What are the key points?",
  "Explain the main topic",
  "Find important details",
];

export default function EmptyState({
  documentName,
  onSuggestionClick,
  onUploaded,
}: EmptyStateProps) {
  if (!documentName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
          <div className="p-4 rounded-2xl bg-secondary border border-border">
            <FileText size={48} className="text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Chat with your PDF
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Upload a document to start asking questions about its content.
            </p>
          </div>
          <div className="w-full max-w-md">
            <FileUpload onUploaded={onUploaded ?? (() => {})} size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Ready to chat
          </h2>
          <p className="text-muted-foreground">
            Ask anything about{" "}
            <span className="text-accent font-medium">{documentName}</span>
          </p>
        </div>
        <div
          className="flex flex-wrap justify-center gap-2 max-w-md"
          role="group"
          aria-label="Suggested questions"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-4 py-2 text-sm rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
