import type { Page } from "@playwright/test";

/**
 * Subscribes to uncaught page errors before navigation. Mutates `messages` when errors occur.
 */
export function attachPageErrorCollector(page: Page): { messages: string[] } {
  const messages: string[] = [];
  page.on("pageerror", (err) => {
    messages.push(err.message);
  });
  return { messages };
}
