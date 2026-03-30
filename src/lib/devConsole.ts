/**
 * Development-only console helpers so production browser consoles stay clean.
 * Server routes (e.g. NextAuth) should keep using `console.error` when ops logging matters.
 */
export function devError(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "development") return;
  console.error(...args);
}

export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "development") return;
  console.log(...args);
}
