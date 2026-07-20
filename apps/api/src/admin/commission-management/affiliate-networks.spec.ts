import {
  listAffiliateNetworks,
  sourceForAffiliateNetwork,
} from './affiliate-networks';

describe('affiliate-networks', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
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
    // The Accesstrade provider authenticates with username+password (the
    // provisioning flow), so the panel's "connected" flag must reflect those —
    // not the legacy ACCESSTRADE_API_KEY — or the panel and provider disagree.
    const accesstrade = () =>
      listAffiliateNetworks().find((n) => n.id === 'accesstrade');

    it('given username AND password set > then accesstrade is connected', () => {
      process.env.ACCESSTRADE_USERNAME = 'pub@gogocash.co';
      process.env.ACCESSTRADE_PASSWORD = 'secret';

      expect(accesstrade()?.connected).toBe(true);
    });

    it('given only one of username/password > then accesstrade is not connected', () => {
      process.env.ACCESSTRADE_USERNAME = 'pub@gogocash.co';
      delete process.env.ACCESSTRADE_PASSWORD;

      expect(accesstrade()?.connected).toBe(false);
    });

    it('given neither credential > then accesstrade is not connected', () => {
      delete process.env.ACCESSTRADE_USERNAME;
      delete process.env.ACCESSTRADE_PASSWORD;

      expect(accesstrade()?.connected).toBe(false);
    });
  });
});
