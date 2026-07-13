import { AffiliateProviderRegistry } from './affiliate-provider.registry';
import { AffiliateNetworkProvider } from './affiliate-provider.interface';

function fakeProvider(
  source: AffiliateNetworkProvider['source'],
  enabled: boolean,
): AffiliateNetworkProvider {
  return {
    source,
    isEnabled: () => enabled,
    syncOffers: jest.fn(),
    mintTrackingLink: jest.fn(),
    refreshOffer: jest.fn(),
  };
}

describe('AffiliateProviderRegistry', () => {
  const involve = fakeProvider('involve', true);
  const optimise = fakeProvider('optimise', false);

  const registry = new AffiliateProviderRegistry([involve, optimise]);

  it("providerFor > given 'involve' > then resolves the involve provider", () => {
    expect(registry.providerFor('involve')).toBe(involve);
  });

  it("providerFor > given a disabled network's source > then still resolves it (enabled state is the caller's check)", () => {
    // optimise is registered but disabled — providerFor must not filter it out.
    expect(registry.providerFor('optimise')).toBe(optimise);
  });

  it("providerFor > given 'manual' > then returns null", () => {
    expect(registry.providerFor('manual')).toBeNull();
  });

  it('providerFor > given an unknown source > then returns null', () => {
    expect(registry.providerFor('mystery-network')).toBeNull();
  });

  it('enabledProviders > given a mix of enabled/disabled > then returns only the enabled ones', () => {
    const enabled = registry.enabledProviders();

    expect(enabled).toEqual([involve]);
    expect(enabled).not.toContain(optimise);
  });
});
