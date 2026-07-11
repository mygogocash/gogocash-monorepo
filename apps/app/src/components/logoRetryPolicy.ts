/**
 * Retry policy for brand-logo image loads.
 *
 * Field bug 2026-07-11: one transient failure (the media host's Cloudflare
 * hotlink/bot layer can 403 sporadically) pinned the tinted-initials
 * placeholder for the WHOLE session — King Power showed "KP" until the app
 * was killed. A failed logo now retries a bounded number of times with a
 * short backoff before the placeholder sticks.
 */
export const LOGO_RETRY_DELAY_MS = 4000;

/** Total load attempts (initial + retries) before the placeholder sticks. */
export const LOGO_MAX_LOAD_ATTEMPTS = 3;

export function shouldScheduleLogoRetry(failedAttempts: number): boolean {
  return failedAttempts < LOGO_MAX_LOAD_ATTEMPTS;
}
