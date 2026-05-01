/** localStorage key — must stay in sync with `ConsentBanner` dismissal. */
export const PDPA_CONSENT_BANNER_DISMISSED_KEY = "pdpa_consent_banner_dismissed_v1" as const;

export const CONSENT_BANNER_OPEN_EVENT = "gc:open-consent-banner" as const;
export const CONSENT_BANNER_DISMISSED_EVENT = "gc:consent-banner-dismissed" as const;

type OpenOptions = {
  /**
   * When true (default), clears the dismissal flag so behavior matches a first visit.
   * Set false to only reveal the banner for this session without clearing storage.
   */
  resetDismissal?: boolean;
};

/** Programmatically open the cookie / PDPA consent banner (e.g. internal QA button). */
export function requestOpenConsentBanner(options?: OpenOptions): void {
  if (typeof window === "undefined") return;
  const reset = options?.resetDismissal ?? true;
  if (reset) {
    try {
      localStorage.removeItem(PDPA_CONSENT_BANNER_DISMISSED_KEY);
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent(CONSENT_BANNER_OPEN_EVENT));
}
