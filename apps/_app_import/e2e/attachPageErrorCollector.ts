import type { ConsoleMessage, Page } from "@playwright/test";

export type PageIssueCollectorOptions = {
  /** Collect `console.error` (default true). */
  consoleErrors?: boolean;
  /**
   * Also fail on `console.warning` (Playwright type `warning`).
   * Enable with `PLAYWRIGHT_STRICT_CONSOLE=1` for deeper hygiene checks (can be noisy with third-party scripts).
   */
  consoleWarnings?: boolean;
};

function formatConsoleMessage(msg: ConsoleMessage): string {
  const loc = msg.location();
  const where =
    loc.url && loc.lineNumber != null
      ? ` (${loc.url}:${loc.lineNumber})`
      : loc.url
        ? ` (${loc.url})`
        : "";
  return `console.${msg.type()}: ${msg.text()}${where}`;
}

/**
 * Subscribes to page errors and (optionally) console `error` / `warning` before navigation.
 * Mutates `messages` when issues occur.
 */
export function attachPageErrorCollector(
  page: Page,
  options: PageIssueCollectorOptions = {}
): { messages: string[] } {
  const strictEnv = process.env.PLAYWRIGHT_STRICT_CONSOLE === "1";
  const { consoleErrors = true, consoleWarnings = strictEnv } = options;
  const messages: string[] = [];

  page.on("pageerror", (err) => {
    messages.push(err.message);
  });

  if (consoleErrors || consoleWarnings) {
    page.on("console", (msg) => {
      const t = msg.type();
      if (consoleErrors && t === "error") {
        messages.push(formatConsoleMessage(msg));
      }
      if (consoleWarnings && t === "warning") {
        messages.push(formatConsoleMessage(msg));
      }
    });
  }

  return { messages };
}
