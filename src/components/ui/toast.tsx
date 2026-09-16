"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error";

export interface ToastMessage {
  message: string;
  variant: ToastVariant;
  /** Milliseconds before auto-dismiss. Default 4000. */
  duration?: number;
}

interface ActiveToast extends Required<ToastMessage> {
  id: string;
}

interface ToastContextValue {
  show(toast: ToastMessage): void;
  success(message: string): void;
  error(message: string): void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION_MS = 4000;

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof CheckCircle2; classes: string }> = {
  success: { icon: CheckCircle2, classes: "border-(--color-success)/30 bg-(--color-success-soft) text-(--color-success)" },
  error: { icon: XCircle, classes: "border-(--color-danger)/30 bg-(--color-danger-soft) text-(--color-danger)" },
};

/**
 * Transient, auto-dismissing feedback — replaces the inline
 * `{notice && <p>}` pattern used everywhere in the pre-V3.0 portal. Mounted
 * once at the root (src/app/layout.tsx) so any authenticated shell can call
 * `useToast()` without its own provider.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ActiveToast[]>([]);
  const dismissalTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = dismissalTimers.current.get(id);
    if (timer) clearTimeout(timer);
    dismissalTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastMessage) => {
      const id = crypto.randomUUID();
      const duration = toast.duration ?? DEFAULT_DURATION_MS;
      setToasts((current) => [...current, { ...toast, duration, id }]);
      dismissalTimers.current.set(id, setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  const success = useCallback((message: string) => show({ message, variant: "success" }), [show]);
  const error = useCallback((message: string) => show({ message, variant: "error" }), [show]);

  // Tests and client-side navigation can unmount this provider before an
  // auto-dismiss fires. Clearing outstanding callbacks prevents a stale
  // state update after the React tree (or JSDOM window) has gone away.
  useEffect(() => () => {
    dismissalTimers.current.forEach((timer) => clearTimeout(timer));
    dismissalTimers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      >
        {toasts.map((toast) => {
          const { icon: Icon, classes } = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg transition-[opacity,transform] duration-200 ${classes}`}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
