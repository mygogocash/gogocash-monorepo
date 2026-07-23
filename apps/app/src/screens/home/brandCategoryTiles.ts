/**
 * The four curated category tiles under Top Brands. Each shows up to three real
 * brand logos from that category — the cluster is the pull, so a tile with no
 * logos is dropped rather than rendered empty.
 *
 * Fed from the same catalogue the home grid already loads, so this adds no fetch.
 */
import type { LiveCompactBrandCard } from "@mobile/account/brandCatalogResource";

export const BRAND_CATEGORY_TILE_LOGO_COUNT = 3;

type BrandCategoryDefinition = {
  readonly id: string;
  readonly label: string;
  /** Lowercase substrings matched against an offer's `categories` field. */
  readonly terms: readonly string[];
};

export const BRAND_CATEGORY_DEFINITIONS: readonly BrandCategoryDefinition[] = [
  { id: "travel", label: "Travel", terms: ["travel"] },
  { id: "health-beauty", label: "Health & Beauty", terms: ["beauty", "health"] },
  { id: "fashion", label: "Fashion", terms: ["fashion"] },
  { id: "electronics", label: "Electronics", terms: ["electronic"] },
];

export type BrandCategoryTile = {
  readonly brandCount: number;
  readonly href: string;
  readonly id: string;
  readonly label: string;
  readonly logos: readonly { readonly logoUri?: string; readonly tint: string }[];
  /** Formatted like the brand cards ("9.8%"), or "" when nothing is curated. */
  readonly topCashback: string;
};

export function brandCategoryHref(label: string): string {
  return `/category/${encodeURIComponent(label)}`;
}

function parseCashback(value: string): number {
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchesCategory(card: LiveCompactBrandCard, terms: readonly string[]): boolean {
  const normalized = card.category.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function resolveBrandCategoryTiles(
  cards: readonly LiveCompactBrandCard[],
): BrandCategoryTile[] {
  return BRAND_CATEGORY_DEFINITIONS.map((definition) => {
    const matched = cards.filter((card) => matchesCategory(card, definition.terms));
    const topCashback = matched.reduce(
      (best, card) => Math.max(best, parseCashback(card.cashback)),
      0,
    );

    return {
      brandCount: matched.length,
      href: brandCategoryHref(definition.label),
      id: definition.id,
      label: definition.label,
      logos: matched.slice(0, BRAND_CATEGORY_TILE_LOGO_COUNT).map((card) => ({
        logoUri: card.logoUri,
        tint: card.tint,
      })),
      topCashback: topCashback > 0 ? `${topCashback}%` : "",
    };
  }).filter((tile) => tile.logos.length > 0);
}
