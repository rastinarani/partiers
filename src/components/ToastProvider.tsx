"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import FadeIn from "./motion/FadeIn";

interface Toast {
  id: number;
  message: string;
  kind: "success" | "error";
}
type Notify = (message: string, kind?: Toast["kind"]) => void;
const ToastContext = createContext<Notify>(() => {});
export const useToast = () => useContext(ToastContext);

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);
  const notify = useCallback<Notify>(
    (message, kind = "success") => {
      const id = ++nextId.current;
      setToasts((previous) => {
        const next = [...previous, { id, message, kind }];
        const recentSuccesses = next
          .filter((toast) => toast.kind === "success")
          .slice(-3);
        return next.filter(
          (toast) => toast.kind === "error" || recentSuccesses.includes(toast),
        );
      });
      // Errors stay until dismissed so a slower reader never loses the explanation.
      if (kind === "success")
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), 8000),
        );
    },
    [dismiss],
  );
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return (
    <ToastContext value={notify}>
      {children}
      <section
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 ml-auto max-h-[50vh] max-w-sm space-y-2 overflow-y-auto"
      >
        {toasts.map((toast) => (
          <FadeIn key={toast.id}>
            <div
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-lg ${toast.kind === "error" ? "border-danger/30" : "border-success/30"}`}
            >
              <p
                role={toast.kind === "error" ? "alert" : "status"}
                className="min-w-0 flex-1 break-words text-sm"
              >
                {toast.message}
              </p>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="rounded-lg px-2 text-muted hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => dismiss(toast.id)}
              >
                ×
              </button>
            </div>
          </FadeIn>
        ))}
      </section>
    </ToastContext>
  );
}
