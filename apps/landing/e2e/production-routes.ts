/**
 * User-facing HTML routes for production smoke + mobile overflow checks.
 * Update when adding new `app` routes (page.tsx) or learn articles you ship.
 *
 * Learn sample: first article in lib/learn-articles.ts (stable slug).
 */
export const PRODUCTION_PAGE_PATHS = [
  "/",
  "/en",
  "/th",
  "/id",
  "/ja",
  "/tw",
  "/cn",
  "/learn",
  "/learn/how-cashback-works",
  "/about",
  "/privacy-policy",
  "/terms-of-service",
  "/term-of-use",
  "/how-gogocash-makes-money",
  "/search?q=cashback",
] as const;
