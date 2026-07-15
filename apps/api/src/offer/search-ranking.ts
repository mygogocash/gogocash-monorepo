export type SearchRankingTreatment = 'pinned' | 'boost' | 'blocked';

export type SearchRankingRule = {
  offerId: string;
  treatment: SearchRankingTreatment;
  keywords: readonly string[];
  weight?: number;
  active: boolean;
};

type SearchRankableOffer = {
  _id: unknown;
  offer_name?: string;
  offer_name_display?: string;
};

function ruleMatchesQuery(rule: SearchRankingRule, query: string): boolean {
  if (!rule.active) return false;
  const keywords = rule.keywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
  return (
    keywords.length === 0 || keywords.some((keyword) => query.includes(keyword))
  );
}

export function rankOffersWithSearchRules<T extends SearchRankableOffer>(
  search: string,
  offers: readonly T[],
  rules: readonly SearchRankingRule[],
  legacyFeaturedTerms: readonly string[] = [],
): T[] {
  const query = search.trim().toLowerCase();
  if (!query) return [...offers];

  const applicableRules = rules.filter((rule) => ruleMatchesQuery(rule, query));
  const blockedOfferIds = new Set(
    applicableRules
      .filter((rule) => rule.treatment === 'blocked')
      .map((rule) => rule.offerId),
  );
  const featuredTerms = legacyFeaturedTerms
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  return offers
    .map((offer, index) => {
      const offerId = String(offer._id);
      const offerRules = applicableRules.filter(
        (rule) => rule.offerId === offerId,
      );
      const pinnedScore = offerRules.some((rule) => rule.treatment === 'pinned')
        ? 1_000_000
        : 0;
      const boostScore = offerRules
        .filter((rule) => rule.treatment === 'boost')
        .reduce((sum, rule) => sum + Math.max(0, rule.weight ?? 1), 0);
      const haystack =
        `${offer.offer_name_display ?? ''} ${offer.offer_name ?? ''}`.toLowerCase();
      const legacyFeaturedScore = featuredTerms.some(
        (term) => query.includes(term) && haystack.includes(term),
      )
        ? 1000
        : 0;
      return {
        offer,
        index,
        blocked: blockedOfferIds.has(offerId),
        score: pinnedScore + legacyFeaturedScore + boostScore,
      };
    })
    .filter((entry) => !entry.blocked)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.offer);
}
