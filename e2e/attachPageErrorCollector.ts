import type { Page } from "@playwright/test";

export const SDK55_FRAMEWORK_WARNINGS = [
  "props.pointerEvents is deprecated. Use style.pointerEvents",
  'shadow*" style props are deprecated. Use "boxShadow"',
  "Image: style.resizeMode is deprecated. Please use props.resizeMode.",
  "Animated: `useNativeDriver` is not supported because the native animated module is missing.",
] as const;

export type PageErrorCollectorOptions = {
  consoleWarnings?: boolean;
  pageErrors?: boolean;
  extraAllowlist?: string[];
};

export type PageErrorCollector = {
  messages: string[];
  detach: () => void;
};

function isAllowlisted(message: string, extraAllowlist: string[] = []): boolean {
  const allowlist = [...SDK55_FRAMEWORK_WARNINGS, ...extraAllowlist];
  return allowlist.some((allowed) => message.includes(allowed));
}

/** Collect console/page errors during a Playwright test; filter RN Web SDK55 noise. */
export function attachPageErrorCollector(
  page: Page,
  options: PageErrorCollectorOptions = {},
): PageErrorCollector {
  const messages: string[] = [];
  const { consoleWarnings = false, pageErrors = true, extraAllowlist = [] } = options;

  const onConsole = (msg: { type: () => string; text: () => string }) => {
    const type = msg.type();
    if (type === "error" || (consoleWarnings && type === "warning")) {
      const text = msg.text();
      if (!isAllowlisted(text, extraAllowlist)) {
        messages.push(`[console.${type}] ${text}`);
      }
    }
  };

  const onPageError = (error: Error) => {
    if (pageErrors && !isAllowlisted(error.message, extraAllowlist)) {
      messages.push(`[pageerror] ${error.message}`);
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  return {
    messages,
    detach: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}

export function actionableMessages(
  messages: string[],
  extraAllowlist: string[] = [],
): string[] {
  return messages.filter((message) => !isAllowlisted(message, extraAllowlist));
}
