/** Responsive hint for Next/Image in offer tables (~40–48px thumbnails). */
export const OFFER_THUMB_SIZES = "(max-width: 640px) 40px, 48px";

/** Fixed slot for review page media grid (80×80). */
export const OFFER_REVIEW_MEDIA_SIZES = "80px";

export function hasNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.length > 0;
}
