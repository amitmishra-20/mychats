"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, FileText, Trash2 } from "lucide-react";
import { Document } from "@/types/chat";
import { DocumentSkeleton } from "@/components/ui/skeleton";

interface DocumentListProps {
  selectedDocumentId: string | null;
  onSelect: (documentId: string | null) => void;
  refreshTrigger: number;
  onRefresh?: () => void;
}

export default function DocumentList({
  selectedDocumentId,
  onSelect,
  refreshTrigger,
  onRefresh,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/documents/list");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!cancelled) setDocuments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        if (!cancelled) setDeleteError("Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshTrigger]);

  const handleDelete = useCallback(async (documentId: string) => {
    setDeleteError(null);
    // Optimistic removal
    setDocuments((prev) => prev.filter((d) => d.document_id !== documentId));

    try {
      const res = await fetch("/api/documents/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }

      if (selectedDocumentId === documentId) {
        onSelect(null);
      }

      setDeletingId(null);
      onRefresh?.();
    } catch (error) {
      console.error("Failed to delete document:", error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete");
      setDeletingId(null);
      // Re-fetch to restore the document
      onRefresh?.();
    }
  }, [selectedDocumentId, onSelect, onRefresh]);

  if (loading) {
    return <DocumentSkeleton />;
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <FileText size={24} className="text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">No documents yet</p>
        <p className="text-xs text-muted-foreground">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" role="listbox" aria-label="Documents">
      {deleteError && (
        <p className="text-xs text-destructive text-center py-1">{deleteError}</p>
      )}
      {documents.map((doc) => {
        const isSelected = selectedDocumentId === doc.document_id;
        const isDeleting = deletingId === doc.document_id;
        return (
          <div
            key={doc.document_id}
            role="option"
            aria-selected={isSelected}
            className={`group p-2 rounded-lg text-sm cursor-pointer transition-colors ${
              isSelected
                ? "bg-accent/15 border border-accent/40"
                : "bg-secondary hover:bg-background border border-transparent"
            }`}
          >
            <div
              onClick={() =>
                onSelect(isSelected ? null : doc.document_id)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(isSelected ? null : doc.document_id);
                }
              }}
              tabIndex={0}
              className="flex items-start gap-2"
            >
              <FileText size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium truncate">{doc.file_name}</p>
                  {isSelected && <Check size={14} className="text-accent shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {doc.total_chunks} chunks
                </p>
              </div>
            </div>
            {isDeleting ? (
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span className="text-destructive">Delete?</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.document_id);
                  }}
                  className="text-destructive font-medium hover:underline px-2 py-1 rounded"
                >
                  Yes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(null);
                  }}
                  className="text-muted-foreground hover:underline px-2 py-1 rounded"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingId(doc.document_id);
                }}
                className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded"
                aria-label={`Delete ${doc.file_name}`}
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
