import {
  listAffiliateNetworks,
  sourceForAffiliateNetwork,
} from './affiliate-networks';

describe('affiliate-networks', () => {
  const originalAccesstrade = process.env.ACCESSTRADE_API_KEY;

  afterEach(() => {
    if (originalAccesstrade === undefined) {
      delete process.env.ACCESSTRADE_API_KEY;
    } else {
      process.env.ACCESSTRADE_API_KEY = originalAccesstrade;
    }
  });

  describe('sourceForAffiliateNetwork', () => {
    it("given 'accesstrade' > then maps to the 'accesstrade' offer source", () => {
      expect(sourceForAffiliateNetwork('accesstrade')).toBe('accesstrade');
    });

    it("given 'involve_asia' > then still maps to 'involve'", () => {
      expect(sourceForAffiliateNetwork('involve_asia')).toBe('involve');
    });

    it('given an unknown network > then returns null', () => {
      expect(sourceForAffiliateNetwork('mystery')).toBeNull();
    });
  });

  describe('listAffiliateNetworks > accesstrade connected flag', () => {
    it('given ACCESSTRADE_API_KEY set > then accesstrade is connected', () => {
      process.env.ACCESSTRADE_API_KEY = '123456';

      const accesstrade = listAffiliateNetworks().find(
        (n) => n.id === 'accesstrade',
      );

      expect(accesstrade?.connected).toBe(true);
    });

    it('given ACCESSTRADE_API_KEY unset > then accesstrade is not connected', () => {
      delete process.env.ACCESSTRADE_API_KEY;

      const accesstrade = listAffiliateNetworks().find(
        (n) => n.id === 'accesstrade',
      );

      expect(accesstrade?.connected).toBe(false);
    });
  });
});
