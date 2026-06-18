import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse } from "@mobile/api/catalogTypes";

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
  }));
}

export function resolveLiveBrandCards<TFallback extends FallbackCompactBrandCard>(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly TFallback[],
): readonly (TFallback | LiveCompactBrandCard)[] {
  if (source === "backend") {
    return mapOfferCatalogToCompactBrandCards(data);
  }

  return fallback;
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
): readonly TSection[] {
  if (source !== "backend") {
    return fallbackSections;
  }

  const liveCards = mapOfferCatalogToCompactBrandCards(data);

  return fallbackSections.map((section) => {
    const sectionCards = cardsForSection(section.id, liveCards);

    return {
      ...section,
      cards: sectionCards,
      dotCount: undefined,
    };
  });
}
