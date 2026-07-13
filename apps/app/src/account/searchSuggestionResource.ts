import type { LiveCompactBrandCard } from "@mobile/account/brandCatalogResource";
import {
  getTopBrandHref,
  webHomePromoSections,
  webHomeSearchPopularPanel,
} from "@mobile/design/webDesignParity";

export type ResolvedSearchSuggestionItem = {
  readonly brand: string;
  readonly cashback: string;
  readonly href?: string;
  readonly logoBackground: string;
  readonly logoText: string;
  readonly logoTextColor: string;
  readonly logoUri?: string;
};

function brandInitials(brand: string): string {
  const parts = brand
    .replace(/&/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return brand.slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function findLiveCard(term: string, liveCards: readonly LiveCompactBrandCard[]) {
  const normalized = term.toLowerCase();
  return liveCards.find((card) => card.brand.toLowerCase() === normalized);
}

function findPromoSectionCard(term: string) {
  const normalized = term.toLowerCase();
  for (const section of webHomePromoSections) {
    for (const card of section.cards) {
      if (card.brand.toLowerCase() === normalized) {
        return card;
      }
    }
  }

  return undefined;
}

function fromLiveCard(card: LiveCompactBrandCard): ResolvedSearchSuggestionItem {
  return {
    brand: card.brand,
    cashback: card.cashback,
    href: card.href,
    logoBackground: card.tint,
    logoText: card.logoFallbackText ?? brandInitials(card.brand),
    logoTextColor: "#00CC99",
    logoUri: card.logoUri,
  };
}

function fromPopularPanel(
  popular: (typeof webHomeSearchPopularPanel.items)[number],
  promoCard?: { readonly logoUri?: string },
): ResolvedSearchSuggestionItem {
  return {
    brand: popular.brand,
    cashback: popular.cashback,
    href: getTopBrandHref(popular.brand),
    logoBackground: popular.logoBackground,
    logoText:
      popular.logoText.trim().length > 0 ? popular.logoText : brandInitials(popular.brand),
    logoTextColor: popular.logoTextColor,
    logoUri: promoCard?.logoUri,
  };
}

export function resolveSearchSuggestionItem(
  term: string,
  liveCards: readonly LiveCompactBrandCard[],
  fallbackTint: string,
): ResolvedSearchSuggestionItem {
  const live = findLiveCard(term, liveCards);
  if (live) {
    return fromLiveCard(live);
  }

  const popular = webHomeSearchPopularPanel.items.find(
    (item) => item.brand.toLowerCase() === term.toLowerCase(),
  );
  if (popular) {
    return fromPopularPanel(popular, findPromoSectionCard(term));
  }

  const promoOnly = findPromoSectionCard(term);
  if (promoOnly) {
    return {
      brand: promoOnly.brand,
      cashback: promoOnly.cashback,
      href: getTopBrandHref(promoOnly.brand),
      logoBackground: promoOnly.tint,
      logoText: brandInitials(promoOnly.brand),
      logoTextColor: "#00CC99",
      logoUri: promoOnly.logoUri,
    };
  }

  return {
    brand: term,
    cashback: "",
    logoBackground: fallbackTint,
    logoText: brandInitials(term),
    logoTextColor: "#00CC99",
  };
}

function parseCashbackRate(cashback: string): number {
  const rate = Number.parseFloat(cashback.replace(/[^\d.]/g, ""));
  return Number.isFinite(rate) ? rate : 0;
}

// "Popular right now" fallback ordering: brands with real cashback rates rank
// above 0%/unparseable ones; ties keep catalog order (Array.sort is stable).
export function rankPopularLiveBrandTerms(
  liveCards: readonly LiveCompactBrandCard[],
): string[] {
  return [...liveCards]
    .sort((a, b) => parseCashbackRate(b.cashback) - parseCashbackRate(a.cashback))
    .map((card) => card.brand);
}
