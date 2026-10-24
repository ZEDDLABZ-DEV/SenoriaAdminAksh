"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const TOAST_MS = 4500;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const text = message.trim();
      if (!text) return;
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current, { id, message: text, tone }]);
      window.setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-ink/10 ${toneClass(item.tone)}`}
          >
            <span className="flex-1">{item.message}</span>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold opacity-70 hover:opacity-100"
              aria-label="Dismiss"
              onClick={() => dismiss(item.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function toneClass(tone: ToastTone): string {
  if (tone === "success") return "border-pine/30 bg-moss text-pine-dark";
  if (tone === "error") return "border-danger/30 bg-red-50 text-danger";
  return "border-line bg-card text-ink";
}

const noopToast: ToastContextValue = { show: () => undefined, success: () => undefined, error: () => undefined };

/** Returns a no-op outside the provider so components stay usable in isolation. */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? noopToast;
}
