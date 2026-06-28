import { getApiErrorMessage } from "./getApiErrorMessage";

/**
 * Development-only console helpers so production browser consoles and server logs stay quiet.
 * Use for non-critical diagnostics; use `console.error` only when production ops must see failures.
 */
export function devError(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "development") return;
  console.error(...args);
}

/** Log API failures with a readable message (axios interceptor rejects bare `response` objects). */
export function devApiError(
  context: string,
  error: unknown,
  fallback = "Request failed",
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.error(context, getApiErrorMessage(error, fallback), error);
}

export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "development") return;
  console.log(...args);
}
