/**
 * Development-only console helpers so production browser consoles and server logs stay quiet.
 * Use for non-critical diagnostics; use `console.error` only when production ops must see failures.
 */
export function devError(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "development") return;
  console.error(...args);
}

export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "development") return;
  console.log(...args);
}
