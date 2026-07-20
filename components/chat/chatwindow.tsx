"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Message } from "@/types/chat";
import { FileText, RotateCcw, Menu } from "lucide-react";
import MessageInput from "./messageinput";
import MessageList from "./messagelist";
import EmptyState from "./emptystate";

const MAX_MESSAGES = 20;
const LOCAL_STORAGE_DEBOUNCE_MS = 1000;

function getStorageKey(docId: string | null) {
  return docId ? `chatMessages_${docId}` : "chatMessages_none";
}

function getSavedMessages(docId: string | null): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(getStorageKey(docId));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(-MAX_MESSAGES);
    }
  } catch {
    // corrupted data — treat as empty
  }
  return [];
}

interface ChatWindowProps {
  selectedDocumentId: string | null;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onNewChat?: () => void;
  onUploaded?: (documentId?: string) => void;
}

export default function ChatWindow({
  selectedDocumentId,
  onToggleSidebar,
  sidebarOpen,
  onNewChat,
  onUploaded,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    getSavedMessages(selectedDocumentId)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docNames, setDocNames] = useState<Record<string, string>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef(messages);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Reset messages when switching documents
  const prevDocIdRef = useRef(selectedDocumentId);
  useEffect(() => {
    if (prevDocIdRef.current !== selectedDocumentId) {
      prevDocIdRef.current = selectedDocumentId;
      setMessages(getSavedMessages(selectedDocumentId));
      setError(null);
    }
  }, [selectedDocumentId]);

  // Debounced localStorage save
  useEffect(() => {
    if (messages.length > 0 && selectedDocumentId) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(getStorageKey(selectedDocumentId), JSON.stringify(messages));
        } catch {
          // QuotaExceededError — silently ignore
        }
      }, LOCAL_STORAGE_DEBOUNCE_MS);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, selectedDocumentId]);

  // Fetch document names
  useEffect(() => {
    if (!selectedDocumentId || docNames[selectedDocumentId]) return;

    let cancelled = false;
    fetch("/api/documents/list")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((docs) => {
        if (cancelled || !Array.isArray(docs)) return;
        const map: Record<string, string> = {};
        for (const doc of docs) {
          map[doc.document_id] = doc.file_name;
        }
        setDocNames((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {
        // will retry on next mount
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDocumentId, docNames]);

  const effectiveDocName = selectedDocumentId
    ? docNames[selectedDocumentId] ?? null
    : null;

  const handleSend = useCallback(async (text: string) => {
    if (isLoadingRef.current) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isLoadingRef.current = true;

    setError(null);
    lastUserMessageRef.current = text;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage].slice(-MAX_MESSAGES));
    setIsLoading(true);

    const currentMessages = [...messagesRef.current, newMessage].slice(-MAX_MESSAGES);

    let result: Response;
    try {
      result = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          documentId: selectedDocumentId,
        }),
        signal: controller.signal,
      });
    } catch {
      setError("Failed to connect to server. Please try again.");
      setIsLoading(false);
      isLoadingRef.current = false;
      return;
    }

    if (!result.ok) {
      const errorData = await result.json().catch(() => ({ error: "Unknown error" }));
      setError(errorData.error || "Something went wrong. Please try again.");
      setIsLoading(false);
      isLoadingRef.current = false;
      return;
    }

    const aiMessageId = crypto.randomUUID();
    try {
      const reader = result.body?.getReader();
      if (!reader) {
        setError("Failed to read response. Please try again.");
        setIsLoading(false);
        isLoadingRef.current = false;
        return;
      }

      const decoder = new TextDecoder();

      setMessages((prev) => [
        ...prev,
        { id: aiMessageId, role: "assistant", content: "", timestamp: Date.now() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const next = [...prev];
          const index = next.findIndex((m) => m.id === aiMessageId);
          if (index !== -1) {
            next[index] = {
              ...next[index],
              content: next[index].content + chunk,
            };
          }
          return next;
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          const index = next.findIndex((m) => m.id === aiMessageId);
          if (index !== -1) {
            next[index] = {
              ...next[index],
              content: next[index].content + "\n\nGeneration stopped",
            };
          }
          return next;
        });
        return;
      }

      console.error(error);
      setError("An error occurred while generating the response.");
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [selectedDocumentId]);

  const handleRetry = useCallback(() => {
    if (lastUserMessageRef.current) {
      handleSend(lastUserMessageRef.current);
    }
  }, [handleSend]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setError(null);
    if (selectedDocumentId) {
      try {
        localStorage.removeItem(getStorageKey(selectedDocumentId));
      } catch {
        // ignore
      }
    }
    onNewChat?.();
  }, [selectedDocumentId, onNewChat]);

  const hasMessages = messages.length > 0;

  return (
    <section className="flex-1 flex flex-col overflow-hidden bg-card min-w-0 text-foreground">
      {hasMessages && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {!sidebarOpen && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                aria-label="Open sidebar"
              >
                <Menu size={18} />
              </button>
            )}
            <FileText size={16} className="text-accent shrink-0" />
            <span className="text-sm font-medium truncate">
              {effectiveDocName ?? "Chat"}
            </span>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 rounded-lg hover:bg-secondary"
            aria-label="Start new chat"
          >
            <RotateCcw size={14} />
            New chat
          </button>
        </div>
      )}
      {!sidebarOpen && !hasMessages && (
        <div className="px-4 pt-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
          >
            <Menu size={14} />
            Open sidebar
          </button>
        </div>
      )}
      {error && (
        <div className="w-full px-4 py-2 bg-destructive/15 border-b border-destructive/30 text-destructive text-sm shrink-0">
          <div className="flex items-center justify-center gap-3">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="text-xs font-medium underline hover:text-foreground transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {messages.length === 0 ? (
        <EmptyState
          documentName={effectiveDocName}
          onSuggestionClick={handleSend}
          onUploaded={onUploaded}
        />
      ) : (
        <MessageList messages={messages} isLoading={isLoading} />
      )}
      {selectedDocumentId && (
        <MessageInput
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
          documentName={effectiveDocName}
        />
      )}
    </section>
  );
}
