/**
 * Validates post-login redirect targets to reduce open-redirect risk.
 * Accepts same-origin paths only (must start with `/`, not `//`, no scheme).
 */
export function safeAppPathFromCallback(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("/\\")) return null;
  return trimmed;
}

export const DEFAULT_POST_LOGIN_PATH = "/dashboard";
