"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface ToastProps {
  message: string;
  variant?: "error" | "success";
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({
  message,
  variant = "error",
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const [hidden, setHidden] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setHidden(false);
    });

    timerRef.current = setTimeout(() => {
      setHidden(true);
      dismissTimerRef.current = setTimeout(onDismiss, 200);
    }, duration);

    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [duration, onDismiss]);

  const styles =
    variant === "error"
      ? "bg-destructive/15 border-destructive/30 text-destructive"
      : "bg-accent/15 border-accent/30 text-accent";

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all duration-200 ${styles} ${
        hidden ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      }`}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={() => {
          setHidden(true);
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(onDismiss, 200);
        }}
        className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
