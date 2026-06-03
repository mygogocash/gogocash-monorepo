/**
 * Cookie consent state (issue #7 — PDPA/GDPR). Binary accept/reject: a single
 * decision gates all non-essential trackers (Firebase Analytics + LINE Tag).
 * Client-only (static export has no server to enforce consent). Mirrors the
 * storage + CustomEvent pattern in `lib/locale-storage.ts`.
 */
export const COOKIE_CONSENT_KEY = "gogocash.cookie_consent";

/** Dispatched after a decision is persisted; trackers re-evaluate on this. */
export const COOKIE_CONSENT_EVENT = "gogocash:cookie-consent";

/** Dispatched by the "Cookie Settings" footer link to re-open the banner. */
export const COOKIE_CONSENT_OPEN_EVENT = "gogocash:cookie-consent-open";

/** Bump to re-prompt everyone when the cookie categories materially change. */
export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsent = {
  version: number;
  /** true = analytics + marketing trackers allowed; false = rejected. */
  accepted: boolean;
  decidedAt: string;
};

/** Pure: validate a stored raw string into consent, or null if undecided/invalid/stale. */
export function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (typeof parsed.accepted !== "boolean") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      accepted: parsed.accepted,
      decidedAt:
        typeof parsed.decidedAt === "string" ? parsed.decidedAt : "",
    };
  } catch {
    return null;
  }
}

export function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    return null;
  }
}

/** Has the visitor made a choice yet? When false, show the banner. */
export function hasDecidedConsent(): boolean {
  return readConsent() !== null;
}

/**
 * May non-essential trackers run? Opt-in: false unless the visitor explicitly
 * accepted. Undecided and rejected both return false.
 */
export function isAnalyticsAllowed(): boolean {
  return readConsent()?.accepted === true;
}

/** Persist a decision and notify trackers/UI. */
export function persistConsent(accepted: boolean): void {
  if (typeof window === "undefined") return;
  const value: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    accepted,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
  } catch {
    /* storage blocked (private mode) — decision applies for this session only */
  }
  window.dispatchEvent(
    new CustomEvent<CookieConsent>(COOKIE_CONSENT_EVENT, { detail: value }),
  );
}

/** Re-open the consent banner (e.g. from the footer "Cookie Settings" link). */
export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_OPEN_EVENT));
}
