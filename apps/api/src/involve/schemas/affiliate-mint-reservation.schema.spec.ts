import {
  AFFILIATE_MINT_RESERVATION_COLLECTION,
  AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX,
  AFFILIATE_MINT_RESERVATION_TTL_INDEX,
  AffiliateMintReservationSchema,
} from './affiliate-mint-reservation.schema';

describe('AffiliateMintReservation schema retention contract', () => {
  it('uses the operational collection and disables automatic index mutation', () => {
    expect(AffiliateMintReservationSchema.get('collection')).toBe(
      AFFILIATE_MINT_RESERVATION_COLLECTION,
    );
    expect(AffiliateMintReservationSchema.get('autoIndex')).toBe(false);
  });

  it('defines an absolute TTL index restricted to safe expiring states', () => {
    expect(AFFILIATE_MINT_RESERVATION_TTL_INDEX).toBe(
      'affiliate_mint_reservation_safe_expiry_v2',
    );
    expect(AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX).toBe(
      'affiliate_mint_reservation_safe_expiry_v1',
    );
    expect(AffiliateMintReservationSchema.indexes()).toContainEqual([
      { expires_at: 1 },
      {
        name: AFFILIATE_MINT_RESERVATION_TTL_INDEX,
        expireAfterSeconds: 0,
        partialFilterExpression: {
          status: { $in: ['reserved', 'committed', 'pre_mint_failed'] },
        },
      },
    ]);
  });
});
