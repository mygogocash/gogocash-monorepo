/**
 * DOM id of the visible reCAPTCHA slot the auth card mounts on web. Lives in
 * its own module (no firebase imports) so the screen can reference it without
 * pulling the Firebase SDK into render-test bundles.
 */
export const RECAPTCHA_INLINE_CONTAINER_ID = "gogocash-recaptcha-inline";
