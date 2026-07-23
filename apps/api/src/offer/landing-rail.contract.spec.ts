import {
  DEFAULT_LANDING_RAIL_CARD_VARIANT,
  LANDING_RAIL_FIXTURE_META,
  MAX_LANDING_RAILS,
  MAX_LANDING_RAIL_BRANDS,
  landingRailMemberIds,
  normalizeLandingRailForSave,
  normalizeLandingRailId,
  normalizeLandingRailMeta,
  normalizeLandingRailsForSave,
  sortLandingRails,
} from './landing-rail.contract';

describe('normalizeLandingRailId', () => {
  it('normalizeLandingRailId > given mixed-case spaced title > then returns a slug', () => {
    expect(normalizeLandingRailId('  Travel Deals are Here! ')).toBe(
      'travel-deals-are-here',
    );
  });

  it('normalizeLandingRailId > given empty > then returns empty string', () => {
    expect(normalizeLandingRailId(undefined)).toBe('');
    expect(normalizeLandingRailId('   ')).toBe('');
  });

  it('normalizeLandingRailId > given long edge separators > then trims them without changing the slug', () => {
    const separators = '-'.repeat(100_000);
    expect(normalizeLandingRailId(`${separators}Travel${separators}`)).toBe(
      'travel',
    );
  });
});

describe('normalizeLandingRailMeta', () => {
  it('normalizeLandingRailMeta > given full rail > then trims and slugs identity', () => {
    const meta = normalizeLandingRailMeta({
      railId: 'Trending',
      title: '  Trending Brands ',
      emoji: '✈️',
      link: '/category/Travel',
      cardVariant: 'brandLogoBadge',
      position: 2,
      enabled: true,
    });
    expect(meta).toEqual({
      railId: 'trending',
      title: 'Trending Brands',
      emoji: '✈️',
      link: '/category/Travel',
      cardVariant: 'brandLogoBadge',
      position: 2,
      enabled: true,
    });
  });

  it('normalizeLandingRailMeta > given missing cardVariant > then applies default', () => {
    const meta = normalizeLandingRailMeta({ railId: 'x', title: 'X' });
    expect(meta.cardVariant).toBe(DEFAULT_LANDING_RAIL_CARD_VARIANT);
  });

  it('normalizeLandingRailMeta > given absent enabled > then defaults to enabled', () => {
    expect(normalizeLandingRailMeta({ railId: 'x' }).enabled).toBe(true);
  });

  it('normalizeLandingRailMeta > given explicit false enabled > then disabled', () => {
    expect(
      normalizeLandingRailMeta({ railId: 'x', enabled: false }).enabled,
    ).toBe(false);
    expect(
      normalizeLandingRailMeta({ railId: 'x', enabled: 'false' }).enabled,
    ).toBe(false);
  });

  it('normalizeLandingRailMeta > given absent position > then falls back to index', () => {
    expect(normalizeLandingRailMeta({ railId: 'x' }, 3).position).toBe(3);
  });
});

describe('sortLandingRails', () => {
  it('sortLandingRails > given unordered positions > then ascending with railId tiebreak', () => {
    const sorted = sortLandingRails([
      { railId: 'b', position: 1 },
      { railId: 'a', position: 0 },
      { railId: 'z', position: 1 },
    ]);
    expect(sorted.map((r) => r.railId)).toEqual(['a', 'b', 'z']);
  });
});

describe('normalizeLandingRailForSave', () => {
  it('normalizeLandingRailForSave > given only legacy brands > then mirrors into both device lists', () => {
    const rail = normalizeLandingRailForSave({
      railId: 'travel',
      title: 'Travel',
      brands: [{ offerId: 'a', cashback: 'ignored' }],
    });
    expect(rail.brands).toEqual([{ offerId: 'a', cashback: '' }]);
    expect(rail.brandsDesktop).toEqual([{ offerId: 'a', cashback: '' }]);
    expect(rail.brandsMobile).toEqual([{ offerId: 'a', cashback: '' }]);
  });

  it('normalizeLandingRailForSave > given device lists > then keeps them independent and mirrors desktop to legacy', () => {
    const rail = normalizeLandingRailForSave({
      railId: 'travel',
      title: 'Travel',
      brandsDesktop: [{ offerId: 'a' }, { offerId: 'b' }],
      brandsMobile: [{ offerId: 'b' }],
    });
    expect(rail.brandsDesktop.map((b) => b.offerId)).toEqual(['a', 'b']);
    expect(rail.brandsMobile.map((b) => b.offerId)).toEqual(['b']);
    expect(rail.brands.map((b) => b.offerId)).toEqual(['a', 'b']);
  });

  it('normalizeLandingRailForSave > given more than max brands > then caps per device', () => {
    const many = Array.from(
      { length: MAX_LANDING_RAIL_BRANDS + 5 },
      (_, i) => ({
        offerId: `id-${i}`,
      }),
    );
    const rail = normalizeLandingRailForSave({
      railId: 'trending',
      title: 'Trending',
      brandsDesktop: many,
    });
    expect(rail.brandsDesktop).toHaveLength(MAX_LANDING_RAIL_BRANDS);
  });

  it('normalizeLandingRailForSave > given duplicate offer ids > then drops duplicates preserving order', () => {
    const rail = normalizeLandingRailForSave({
      railId: 'trending',
      title: 'Trending',
      brandsDesktop: [{ offerId: 'a' }, { offerId: 'a' }, { offerId: 'b' }],
    });
    expect(rail.brandsDesktop.map((b) => b.offerId)).toEqual(['a', 'b']);
  });
});

describe('normalizeLandingRailsForSave', () => {
  it('normalizeLandingRailsForSave > given duplicate railIds > then first wins', () => {
    const rails = normalizeLandingRailsForSave([
      { railId: 'travel', title: 'First', position: 0 },
      { railId: 'Travel', title: 'Second', position: 1 },
    ]);
    expect(rails).toHaveLength(1);
    expect(rails[0].title).toBe('First');
  });

  it('normalizeLandingRailsForSave > given blank railId > then drops the rail', () => {
    const rails = normalizeLandingRailsForSave([
      { railId: '', title: 'No id' },
      { railId: 'ok', title: 'Ok' },
    ]);
    expect(rails.map((r) => r.railId)).toEqual(['ok']);
  });

  it('normalizeLandingRailsForSave > given unordered positions > then sorts ascending', () => {
    const rails = normalizeLandingRailsForSave([
      { railId: 'b', title: 'B', position: 2 },
      { railId: 'a', title: 'A', position: 1 },
    ]);
    expect(rails.map((r) => r.railId)).toEqual(['a', 'b']);
  });

  it('normalizeLandingRailsForSave > given more than max rails > then caps the list', () => {
    const input = Array.from({ length: MAX_LANDING_RAILS + 3 }, (_, i) => ({
      railId: `rail-${i}`,
      title: `Rail ${i}`,
      position: i,
    }));
    expect(normalizeLandingRailsForSave(input)).toHaveLength(MAX_LANDING_RAILS);
  });
});

describe('LANDING_RAIL_FIXTURE_META', () => {
  // Source-pinned to webHomePromoSections (apps/app/src/design/webDesignParity.ts).
  it('LANDING_RAIL_FIXTURE_META > mirrors the customer fixture rail identities', () => {
    expect(LANDING_RAIL_FIXTURE_META.map((r) => r.railId)).toEqual([
      'trending',
      'travel',
      'makeup',
    ]);
    expect(LANDING_RAIL_FIXTURE_META.map((r) => r.title)).toEqual([
      'Trending Brands',
      'Travel Deals are Here!',
      'Makeup Must Have!',
    ]);
    expect(LANDING_RAIL_FIXTURE_META.map((r) => r.link)).toEqual([
      '/brand',
      '/category/Travel',
      '/category/Health & Beauty',
    ]);
  });

  it('LANDING_RAIL_FIXTURE_META > survives normalization unchanged', () => {
    const normalized = normalizeLandingRailsForSave(
      LANDING_RAIL_FIXTURE_META.map((rail) => ({ ...rail })),
    );
    expect(normalized.map((r) => r.railId)).toEqual([
      'trending',
      'travel',
      'makeup',
    ]);
  });
});

describe('landingRailMemberIds', () => {
  it('landingRailMemberIds > given rails across devices > then returns unique union', () => {
    const ids = landingRailMemberIds([
      {
        railId: 'travel',
        brandsDesktop: [{ offerId: 'a' }],
        brandsMobile: [{ offerId: 'b' }],
      },
      {
        railId: 'trending',
        brandsDesktop: [{ offerId: 'a' }, { offerId: 'c' }],
      },
    ]);
    expect([...ids].sort()).toEqual(['a', 'b', 'c']);
  });
});
