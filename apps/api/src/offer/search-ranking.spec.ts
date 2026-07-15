import { rankOffersWithSearchRules } from './search-ranking';

describe('rankOffersWithSearchRules', () => {
  const offers = [
    {
      _id: 'offer-a',
      offer_name: 'Alpha Market',
      offer_name_display: 'Alpha Market',
      categories: 'Shopping',
    },
    {
      _id: 'offer-b',
      offer_name: 'Beta Market',
      offer_name_display: 'Beta Market',
      categories: 'Shopping',
    },
    {
      _id: 'offer-c',
      offer_name: 'Central Market',
      offer_name_display: 'Central Market',
      categories: 'Shopping',
    },
  ];

  it('pins, boosts, and blocks only the targeted offers when keywords match', () => {
    const result = rankOffersWithSearchRules('market deals', offers, [
      {
        offerId: 'offer-c',
        treatment: 'pinned',
        keywords: ['market'],
        active: true,
      },
      {
        offerId: 'offer-a',
        treatment: 'boost',
        keywords: ['market'],
        weight: 50,
        active: true,
      },
      {
        offerId: 'offer-b',
        treatment: 'blocked',
        keywords: ['market'],
        active: true,
      },
    ]);

    expect(result.map((offer) => offer._id)).toEqual(['offer-c', 'offer-a']);
  });

  it('ignores inactive rules and keyword-scoped rules that do not match', () => {
    const result = rankOffersWithSearchRules('market', offers, [
      {
        offerId: 'offer-a',
        treatment: 'blocked',
        keywords: ['travel'],
        active: true,
      },
      {
        offerId: 'offer-b',
        treatment: 'pinned',
        keywords: [],
        active: false,
      },
    ]);

    expect(result.map((offer) => offer._id)).toEqual([
      'offer-a',
      'offer-b',
      'offer-c',
    ]);
  });
});
