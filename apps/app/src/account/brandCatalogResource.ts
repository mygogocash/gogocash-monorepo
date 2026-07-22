import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { deriveCatalogTint, mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse } from "@mobile/api/catalogTypes";
import { resolveFixtureBrandCountries } from "@mobile/i18n/fixtureRegionCountries";
import { filterCatalogItemsByRegion, offerMatchesRegion } from "@mobile/i18n/regionCatalogFilter";
import type { RegionCode } from "@mobile/i18n/regionTypes";
import { DEFAULT_REGION } from "@mobile/i18n/regionTypes";

type FallbackCompactBrandCard = {
  readonly brand: string;
  readonly cashback: string;
  readonly href?: string;
  readonly logoAsset?: string;
  readonly logoFallbackText?: string;
  readonly logoUri?: string;
  readonly tint: string;
};

type HomePromoSection = {
  readonly cards: readonly FallbackCompactBrandCard[];
  readonly dotCount?: number;
  readonly icon?: string;
  readonly id: string;
  readonly link: string;
  readonly title: string;
};

export type LiveCompactBrandCard = FallbackCompactBrandCard & {
  readonly category: string;
  readonly href: string;
  readonly countries?: string;
  readonly isGlobal?: boolean;
};

function categoryIncludes(category: string, terms: readonly string[]) {
  const normalized = category.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function mapOfferCatalogToCompactBrandCards(payload: unknown): LiveCompactBrandCard[] {
  if (!isOfferListResponse(payload)) {
    return [];
  }

  return mapOffersToCatalogBrands(payload).map((brand) => ({
    brand: brand.name,
    cashback: brand.cashback,
    category: brand.category,
    href: brand.href,
    logoUri: brand.logo,
    tint: brand.tint,
    countries: brand.countries,
    isGlobal: brand.isGlobal,
  }));
}

function filterCompactBrandCardsByRegion<T extends { brand: string; countries?: string; isGlobal?: boolean }>(
  cards: readonly T[],
  regionCode: RegionCode,
  source: AccountDataSource,
): T[] {
  if (source === "backend") {
    return filterCatalogItemsByRegion(cards, regionCode);
  }

  return cards.filter((card) =>
    offerMatchesRegion(
      card.countries ?? resolveFixtureBrandCountries(card.brand),
      regionCode,
      card.isGlobal,
    ),
  );
}

export function resolveLiveBrandCards<TFallback extends FallbackCompactBrandCard>(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly TFallback[],
  regionCode: RegionCode = DEFAULT_REGION,
): readonly (TFallback | LiveCompactBrandCard)[] {
  if (source === "backend") {
    return filterCompactBrandCardsByRegion(
      mapOfferCatalogToCompactBrandCards(data),
      regionCode,
      source,
    );
  }

  return filterCompactBrandCardsByRegion(fallback, regionCode, source);
}

function cardsForSection(
  sectionId: string,
  cards: readonly LiveCompactBrandCard[],
): readonly LiveCompactBrandCard[] {
  if (sectionId === "travel") {
    return cards.filter((card) => categoryIncludes(card.category, ["travel"]));
  }

  if (sectionId === "makeup") {
    return cards.filter((card) =>
      categoryIncludes(card.category, ["beauty", "health", "makeup", "cosmetic"]),
    );
  }

  return cards;
}

export function resolveHomePromoSections<TSection extends HomePromoSection>(
  source: AccountDataSource,
  data: unknown,
  fallbackSections: readonly TSection[],
  regionCode: RegionCode = DEFAULT_REGION,
): readonly TSection[] {
  if (source !== "backend") {
    return fallbackSections.map((section) => ({
      ...section,
      cards: filterCompactBrandCardsByRegion(section.cards, regionCode, source),
    }));
  }

  const liveCards = filterCompactBrandCardsByRegion(
    mapOfferCatalogToCompactBrandCards(data),
    regionCode,
    source,
  );

  return fallbackSections.map((section) => {
    const sectionCards = cardsForSection(section.id, liveCards);

    return {
      ...section,
      cards: sectionCards,
      dotCount: undefined,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Admin-curated landing rails (GET /offer/landing-rails)             *
 * ------------------------------------------------------------------ */

type LandingRailApiCard = {
  readonly _id?: string;
  readonly offer_id?: number;
  readonly brand?: string;
  readonly logo?: string;
  readonly cashback?: string;
};

type LandingRailApiEntry = {
  readonly railId?: string;
  readonly title?: string;
  readonly emoji?: string;
  readonly link?: string;
  readonly cardVariant?: string;
  readonly data?: readonly LandingRailApiCard[];
  readonly dataDesktop?: readonly LandingRailApiCard[];
  readonly dataMobile?: readonly LandingRailApiCard[];
};

type LandingRailApiResponse = {
  readonly data?: readonly LandingRailApiEntry[];
};

export function isLandingRailsResponse(
  payload: unknown,
): payload is LandingRailApiResponse {
  return (
    payload != null &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  );
}

function mapLandingRailCard(card: LandingRailApiCard): FallbackCompactBrandCard {
  const brand = String(card.brand ?? "").trim();
  return {
    brand,
    cashback: String(card.cashback ?? "").trim(),
    logoUri: card.logo,
    tint: deriveCatalogTint(brand),
  };
}

/**
 * Prefer admin-curated landing rails from GET /offer/landing-rails, falling
 * back to the {@link webHomePromoSections} fixture when the API is unavailable,
 * the account is not in backend mode, or a given rail resolves to zero live
 * cards. The fixture rail order is authoritative so the homepage stays stable
 * even before an admin curates anything; each rail's cards, title, "see all"
 * link, and emoji are overlaid from the API when present.
 */
export function resolveApiLandingRails<TSection extends HomePromoSection>(
  source: AccountDataSource,
  data: unknown,
  fallbackSections: readonly TSection[],
  regionCode: RegionCode = DEFAULT_REGION,
): readonly TSection[] {
  const withFixtureCards = (section: TSection): TSection => ({
    ...section,
    cards: filterCompactBrandCardsByRegion(section.cards, regionCode, source),
  });

  if (source !== "backend" || !isLandingRailsResponse(data)) {
    return fallbackSections.map(withFixtureCards);
  }

  const apiByRailId = new Map<string, LandingRailApiEntry>();
  for (const rail of data.data ?? []) {
    const railId = String(rail?.railId ?? "").trim();
    if (railId && !apiByRailId.has(railId)) {
      apiByRailId.set(railId, rail);
    }
  }

  return fallbackSections.map((section) => {
    const apiRail = apiByRailId.get(section.id);
    if (!apiRail) {
      return withFixtureCards(section);
    }

    const apiCards = apiRail.dataDesktop ?? apiRail.data ?? [];
    // Empty curated rail ⇒ fall back to the fixture cards so no rail is blank.
    const cards =
      apiCards.length > 0
        ? apiCards.map(mapLandingRailCard)
        : filterCompactBrandCardsByRegion(section.cards, regionCode, source);

    const title = String(apiRail.title ?? "").trim() || section.title;
    const link = String(apiRail.link ?? "").trim() || section.link;
    const icon = String(apiRail.emoji ?? "").trim() || section.icon;

    return {
      ...section,
      title,
      link,
      icon,
      cards,
      dotCount: undefined,
    };
  });
}
