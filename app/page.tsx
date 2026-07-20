"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import ChatWindow from "@/components/chat/chatwindow";
import Sidebar from "@/components/chat/sidebar";

const emptySubscribe = () => () => {};

function getSavedDocId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("selectedDocumentId");
  } catch {
    return null;
  }
}

function getIsDesktop(): boolean {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= 768;
}

export default function Home() {
  // Hydration-safe reads from localStorage
  const savedDocId = useSyncExternalStore(emptySubscribe, getSavedDocId, () => null);
  const isDesktop = useSyncExternalStore(emptySubscribe, getIsDesktop, () => true);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(savedDocId);
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectDocument = useCallback((id: string | null) => {
    setSelectedDocumentId(id);
    try {
      if (id) {
        localStorage.setItem("selectedDocumentId", id);
      } else {
        localStorage.removeItem("selectedDocumentId");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleNewChat = useCallback(() => {
    handleSelectDocument(null);
  }, [handleSelectDocument]);

  const handleUploaded = useCallback(
    (documentId?: string) => {
      setRefreshTrigger((prev) => prev + 1);
      if (documentId) {
        handleSelectDocument(documentId);
      }
    },
    [handleSelectDocument]
  );

  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
  const handleToggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <main className="h-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={handleSelectDocument}
        onClose={handleCloseSidebar}
        isOpen={sidebarOpen}
        refreshTrigger={refreshTrigger}
      />
      <ChatWindow
        selectedDocumentId={selectedDocumentId}
        onToggleSidebar={handleToggleSidebar}
        sidebarOpen={sidebarOpen}
        onNewChat={handleNewChat}
        onUploaded={handleUploaded}
      />
    </main>
  );
}
