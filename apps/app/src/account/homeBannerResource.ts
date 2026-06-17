import type { AccountDataSource } from "@mobile/auth/routeGuard";

/**
 * Maps the backend's wide single-document banner shape
 * (GET /offer/banner-home → one doc with image_1..5 + link_1..5) into the
 * array shape the home screen renders (webHomeHeroBanners).
 *
 * This is the "legacy flat backend → new array UI" bridge — the pattern stamp
 * for wiring the other admin-configured domains (coupons, top-brands, quests).
 */

/** Raw payload from GET /offer/banner-home (bannerModel.findOne() → doc | null). */
export type BannerHomeDocument = {
  image_1?: string | null;
  image_2?: string | null;
  image_3?: string | null;
  image_4?: string | null;
  image_5?: string | null;
  link_1?: string | null;
  link_2?: string | null;
  link_3?: string | null;
  link_4?: string | null;
  link_5?: string | null;
} | null;

/**
 * Unified home-hero banner. Fixtures carry a local `asset` key; backend banners
 * carry a remote `imageUri`. The screen renders `{ uri: imageUri }` when present,
 * otherwise the bundled `asset`.
 */
export type HomeHeroBanner = {
  id: string;
  href: string;
  placement: "main" | "side";
  asset?: string;
  imageUri?: string;
};

/**
 * Spec (pinned by home-banner-resource.test.ts):
 * - `null` doc → `[]`
 * - iterate slots 1..5; skip a slot whose `image_N` is empty/missing
 * - placement: slots 1-3 → "main", slots 4-5 → "side"
 * - id: `home-banner-${N}`
 * - href: `link_N` if non-empty, else "/"
 * - imageUri: `image_N`
 *
 * ponytail: one slot-index loop — no per-field repetition. The `as const` on the
 * slot list makes `image_${n}`/`link_${n}` valid keyof lookups (no casts needed).
 */
export function mapBackendHomeBanners(doc: BannerHomeDocument): HomeHeroBanner[] {
  if (!doc) {
    return [];
  }

  const slots = [1, 2, 3, 4, 5] as const;
  return slots
    .map((n) => ({ n, image: doc[`image_${n}`], link: doc[`link_${n}`] }))
    .filter((slot) => Boolean(slot.image))
    .map(
      (slot): HomeHeroBanner => ({
        id: `home-banner-${slot.n}`,
        href: slot.link ? slot.link : "/",
        placement: slot.n <= 3 ? "main" : "side",
        imageUri: slot.image as string,
      }),
    );
}

/**
 * Picks the banners the home screen should render, given the resource's source.
 * - non-backend (fixtures/disabled) → the bundled `fallback` (unchanged contract)
 * - backend with configured banners → the mapped backend banners
 * - backend that returns null/empty → `fallback`, so an unseeded backend never
 *   blanks the hero. ponytail: fall back rather than show an empty carousel.
 *
 * Spec pinned by home-banner-resource.test.ts.
 */
export function resolveHomeHeroBanners(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly HomeHeroBanner[],
): HomeHeroBanner[] {
  if (source === "backend") {
    const mapped = mapBackendHomeBanners(data as BannerHomeDocument);
    if (mapped.length > 0) {
      return mapped;
    }
  }
  return [...fallback];
}
