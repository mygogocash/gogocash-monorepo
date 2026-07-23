import {
  MAX_TOP_BRANDS,
  normalizeTopBrandEntries,
  resolveDeviceBrandEntries,
  type TopBrandConfigLike,
  type TopBrandDevice,
  type TopBrandEntryLike,
} from './top-brand.contract';

/** A curated homepage rail may hold up to this many offers per device. */
export const MAX_LANDING_RAIL_BRANDS = MAX_TOP_BRANDS;

/** Cap on how many rails the homepage can curate at once. */
export const MAX_LANDING_RAILS = 12;

/** Default customer card visual used when a rail omits `cardVariant`. */
export const DEFAULT_LANDING_RAIL_CARD_VARIANT = 'brandLogoBadge';

/**
 * Canonical rail identity + presentation, mirroring the customer fixture
 * `webHomePromoSections` (apps/app/src/design/webDesignParity.ts). Used by the
 * backfill seed so beta/prod ship the same three rails the app falls back to.
 * Brand lists start empty (fixture cards are demo brands, not catalog offers);
 * admins curate real offers per rail afterwards.
 */
export const LANDING_RAIL_FIXTURE_META: readonly {
  railId: string;
  title: string;
  emoji: string;
  link: string;
  cardVariant: string;
  position: number;
}[] = [
  {
    railId: 'trending',
    title: 'Trending Brands',
    emoji: '',
    link: '/brand',
    cardVariant: DEFAULT_LANDING_RAIL_CARD_VARIANT,
    position: 0,
  },
  {
    railId: 'travel',
    title: 'Travel Deals are Here!',
    emoji: '✈️',
    link: '/category/Travel',
    cardVariant: DEFAULT_LANDING_RAIL_CARD_VARIANT,
    position: 1,
  },
  {
    railId: 'makeup',
    title: 'Makeup Must Have!',
    emoji: '💄',
    link: '/category/Health & Beauty',
    cardVariant: DEFAULT_LANDING_RAIL_CARD_VARIANT,
    position: 2,
  },
];

export type { TopBrandDevice, TopBrandEntryLike };

/**
 * Structural view of one persisted landing-rail document. Extends the top-brand
 * device-list contract so `resolveDeviceBrandEntries` / `normalizeTopBrandEntries`
 * can be reused verbatim for the per-rail brand lists.
 */
export type LandingRailConfigLike = TopBrandConfigLike & {
  railId?: unknown;
  title?: unknown;
  emoji?: unknown;
  link?: unknown;
  cardVariant?: unknown;
  position?: unknown;
  enabled?: unknown;
};

/** Normalized rail metadata (identity + presentation), device lists excluded. */
export type NormalizedLandingRailMeta = {
  railId: string;
  title: string;
  emoji: string;
  link: string;
  cardVariant: string;
  position: number;
  enabled: boolean;
};

/** Fully normalized rail ready to persist. */
export type NormalizedLandingRail = NormalizedLandingRailMeta & {
  brands: { offerId: string; cashback: string }[];
  brandsDesktop: { offerId: string; cashback: string }[];
  brandsMobile: { offerId: string; cashback: string }[];
};

/**
 * Slugify a rail identity: lowercase, non-alphanumeric runs collapse to a
 * single dash, edge dashes trimmed. Stable across renames so the customer app
 * and admin panel curate by the same key.
 */
export function normalizeLandingRailId(value: unknown): string {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const withoutLeadingDash = slug.startsWith('-') ? slug.slice(1) : slug;
  return withoutLeadingDash.endsWith('-')
    ? withoutLeadingDash.slice(0, -1)
    : withoutLeadingDash;
}

function toTrimmedString(value: unknown): string {
  return String(value ?? '').trim();
}

function toPosition(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toEnabled(value: unknown): boolean {
  // Absent ⇒ enabled (rails default to visible); only an explicit false hides.
  if (value === undefined || value === null) return true;
  if (typeof value === 'boolean') return value;
  const normalized = toTrimmedString(value).toLowerCase();
  return !(normalized === 'false' || normalized === '0' || normalized === 'no');
}

/**
 * Normalize rail presentation metadata. `index` seeds a stable fallback
 * position when the caller omits one.
 */
export function normalizeLandingRailMeta(
  rail: LandingRailConfigLike | null | undefined,
  index = 0,
): NormalizedLandingRailMeta {
  return {
    railId: normalizeLandingRailId(rail?.railId),
    title: toTrimmedString(rail?.title),
    emoji: toTrimmedString(rail?.emoji),
    link: toTrimmedString(rail?.link),
    cardVariant:
      toTrimmedString(rail?.cardVariant) || DEFAULT_LANDING_RAIL_CARD_VARIANT,
    position: toPosition(rail?.position, index),
    enabled: toEnabled(rail?.enabled),
  };
}

/**
 * Order rails by ascending `position`, breaking ties by `railId` so the
 * sequence is deterministic regardless of input order or Mongo scan order.
 */
export function sortLandingRails<
  T extends { position?: unknown; railId?: unknown },
>(rails: readonly T[]): T[] {
  return [...(rails ?? [])].sort((a, b) => {
    const posA = toPosition(a?.position, 0);
    const posB = toPosition(b?.position, 0);
    if (posA !== posB) return posA - posB;
    return normalizeLandingRailId(a?.railId).localeCompare(
      normalizeLandingRailId(b?.railId),
    );
  });
}

/**
 * Normalize a single rail for persistence. Device lists reuse the top-brand
 * normalizer (trim, drop empties/dupes, cap at MAX_LANDING_RAIL_BRANDS).
 * Legacy `brands` mirrors the desktop list. Cashback is never trusted at write.
 */
export function normalizeLandingRailForSave(
  rail: LandingRailConfigLike | null | undefined,
  index = 0,
): NormalizedLandingRail {
  const meta = normalizeLandingRailMeta(rail, index);
  const hasDeviceLists =
    rail?.brandsDesktop !== undefined || rail?.brandsMobile !== undefined;
  const brandsDesktop = normalizeTopBrandEntries(
    hasDeviceLists
      ? ((rail?.brandsDesktop as TopBrandEntryLike[] | null | undefined) ??
          rail?.brands)
      : rail?.brands,
  );
  const brandsMobile = normalizeTopBrandEntries(
    hasDeviceLists
      ? ((rail?.brandsMobile as TopBrandEntryLike[] | null | undefined) ??
          rail?.brands)
      : rail?.brands,
  );
  return {
    ...meta,
    brands: brandsDesktop,
    brandsDesktop,
    brandsMobile,
  };
}

/**
 * Normalize + de-duplicate a full list of rails for save. Later duplicates of a
 * `railId` are dropped (first wins), blank railIds are rejected, and the list is
 * capped at MAX_LANDING_RAILS after sorting by position.
 */
export function normalizeLandingRailsForSave(
  rails: readonly LandingRailConfigLike[] | null | undefined,
): NormalizedLandingRail[] {
  const seen = new Set<string>();
  const normalized: NormalizedLandingRail[] = [];
  (rails ?? []).forEach((rail, index) => {
    const next = normalizeLandingRailForSave(rail, index);
    if (!next.railId || seen.has(next.railId)) return;
    seen.add(next.railId);
    normalized.push(next);
  });
  return sortLandingRails(normalized).slice(0, MAX_LANDING_RAILS);
}

/** Union of every offerId curated across every rail + device (for eligibility). */
export function landingRailMemberIds(
  rails: readonly LandingRailConfigLike[] | null | undefined,
): string[] {
  const ids: TopBrandEntryLike[] = [];
  for (const rail of rails ?? []) {
    ids.push(...resolveDeviceBrandEntries(rail, 'desktop'));
    ids.push(...resolveDeviceBrandEntries(rail, 'mobile'));
  }
  return normalizeTopBrandEntries(ids).map((entry) => entry.offerId);
}
