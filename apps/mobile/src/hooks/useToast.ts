import { createContext, useContext } from "react";

// Options accepted by show(); kept open for Phase-B callers (e.g. a longer
// duration for error toasts) without churning the public surface.
export type ToastOptions = {
  /** Override the auto-dismiss timeout in ms. Defaults to TOAST_DEFAULT_DURATION_MS. */
  readonly durationMs?: number;
};

export type ToastContextValue = {
  /** Show a transient toast. Auto-dismisses after opts.durationMs (default ~2.5s). */
  readonly show: (message: string, opts?: ToastOptions) => void;
};

// The context object lives here (not in Toast.tsx) so the provider can import it
// without the hook importing the provider — avoids a circular module dependency.
export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}
