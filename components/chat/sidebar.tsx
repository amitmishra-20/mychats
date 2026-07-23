"use client";

import { useCallback, useEffect, useRef } from "react";
import { X, FileText, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import DocumentList from "../documents/documentlist";

interface SidebarProps {
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string | null) => void;
  onClose: () => void;
  isOpen: boolean;
  refreshTrigger?: number;
}

export default function Sidebar({
  selectedDocumentId,
  onSelectDocument,
  onClose,
  isOpen,
  refreshTrigger = 0,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap + Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && sidebarRef.current) {
        const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus the close button on open
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={handleBackdropClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            role="navigation"
            aria-label="Document sidebar"
            className="fixed inset-y-0 left-0 z-50 w-[280px] shrink-0 h-full bg-card border-r border-border md:relative md:z-auto md:w-[280px] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-accent" />
                <h2 className="font-bold text-lg">PDF Chat</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSelectDocument(null)}
                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                  aria-label="New document"
                >
                  <Plus size={18} />
                </button>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="md:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-4 py-3">
              <DocumentList
                selectedDocumentId={selectedDocumentId}
                onSelect={onSelectDocument}
                refreshTrigger={refreshTrigger}
              />
            </div>

            {selectedDocumentId && (
              <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 shrink-0">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <p className="text-xs text-accent font-medium">
                  Chatting with selected document
                </p>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
