"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Upload, Loader2, X } from "lucide-react";

interface FileUploadProps {
  onUploaded: (documentId?: string) => void;
  size?: "sm" | "lg";
}

export default function FileUpload({ onUploaded, size = "sm" }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState("Processing document...");
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isUploading) return;
    const messages = [
      "Processing document...",
      "Extracting text...",
      "Building knowledge base...",
      "Almost ready...",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setUploadStatus(messages[idx]);
    }, 3000);
    return () => clearInterval(interval);
  }, [isUploading]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsUploading(false);
    setError(null);
  }, []);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      showError("Please upload a PDF file");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsUploading(true);
    setUploadStatus("Processing document...");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      onUploaded(data.documentId);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Upload error:", error);
      showError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      abortRef.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isUploading) fileInputRef.current?.click();
    }
  };

  const isLg = size === "lg";

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={isUploading ? "Uploading document" : "Upload a PDF document"}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={`border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          isLg ? "p-10" : "p-4"
        } ${
          isUploading
            ? "border-accent/40 bg-accent/5 cursor-wait"
            : dragOver
              ? "border-accent bg-accent/10 scale-[1.02]"
              : "border-border hover:border-muted-foreground hover:bg-secondary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2
              size={isLg ? 40 : 20}
              className="text-accent animate-spin"
            />
            <div className="space-y-1">
              <p
                className={`font-medium text-foreground ${isLg ? "text-lg" : "text-xs"}`}
              >
                {uploadStatus}
              </p>
              {isLg && (
                <p className="text-sm text-muted-foreground">
                  This may take a moment for large documents
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
              aria-label="Cancel upload"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        ) : (
          <div className={`flex flex-col items-center ${isLg ? "gap-4" : "gap-1.5"}`}>
            <Upload
              size={isLg ? 40 : 18}
              className="text-muted-foreground"
            />
            {isLg ? (
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">
                  Drop a PDF here or click to upload
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports any PDF document
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Drop a PDF or click to upload
              </p>
            )}
          </div>
        )}
      </div>
      {error && (
        <p
          className={`text-destructive text-center ${isLg ? "mt-2 text-sm" : "mt-1.5 text-xs"}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
