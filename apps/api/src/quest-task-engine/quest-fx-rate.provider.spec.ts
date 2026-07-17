import {
  completedFxReferenceDate,
  DefaultQuestFxRateProvider,
} from './quest-fx-rate.provider';

describe('DefaultQuestFxRateProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('derives a stable completed reference date from the immutable transition', () => {
    expect(completedFxReferenceDate(new Date('2026-07-17T23:59:59.000Z'))).toBe(
      '2026-07-16',
    );
    expect(completedFxReferenceDate(new Date('2026-07-17T00:00:00.000Z'))).toBe(
      '2026-07-16',
    );
  });

  it('requests a provider-pinned historical quote rather than a retry-time latest rate', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        date: '2026-07-16',
        base: 'USD',
        quote: 'THB',
        rate: 35.25,
      }),
    } as never);
    const provider = new DefaultQuestFxRateProvider();
    const at = new Date('2026-07-17T05:00:00.000Z');

    await expect(provider.quoteToThb('usd', at)).resolves.toEqual({
      rate: 35.25,
      as_of: new Date('2026-07-16T00:00:00.000Z'),
      source: 'frankfurter:v2:ECB',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.frankfurter.dev/v2/rate/USD/THB?date=2026-07-16&providers=ECB',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('rejects an upstream quote newer than the requested completed date', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        date: '2026-07-17',
        rate: 35.25,
      }),
    } as never);
    const provider = new DefaultQuestFxRateProvider();

    await expect(
      provider.quoteToThb('USD', new Date('2026-07-17T05:00:00.000Z')),
    ).resolves.toBeNull();
  });
});
