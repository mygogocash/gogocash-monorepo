# Coupon insight metrics

Coupon analytics is per coupon. Admins start at **Coupon History** (`/coupon`)
and open **View insight** for one coupon; the former global sample-data page is
retired.

## Metric contract

| Metric       | Meaning                                              | Source                                                                            |
| ------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Detail views | Coupon cards rendered on a customer shop-detail page | Idempotent `view` events from the customer app                                    |
| Code copies  | Successful copy-to-clipboard actions                 | Idempotent `copy` events emitted only after clipboard success                     |
| Copy rate    | `code copies / detail views * 100`                   | Derived by the API; zero when there are no views                                  |
| Usage amount | Count of confirmed redemptions                       | Trusted redemption events, with legacy `Coupon.quantity_used` retained as a floor |

“Usage amount” is deliberately a redemption count, not a monetary value. The
coupon flow does not receive checkout value or currency, so inferring revenue
would be misleading.

## API boundaries

- `POST /offer/coupons/:couponId/events` accepts only `view` and `copy`. It is
  public, rate-limited, contains no customer identity, and requires an
  idempotency `eventId`.
- `GET /offer/coupons/:couponId/insights` requires an admin token.
- `POST /offer/coupons/:couponId/redemptions` requires an admin token and an
  integration-unique `referenceId`. Repeating the reference is a no-op.

The `coupon_activities.dedupe_key` unique index is part of correctness, not
only performance. Confirm that the index is present after the first deployment
before sending production traffic.

## Operational limitation

The API now provides a trusted redemption-ingestion seam, but a merchant or
operations integration must call it when redemption is actually confirmed.
Until that integration is connected, the admin shows existing
`quantity_used` as the legacy usage baseline and honestly shows no auditable
redemption rows. No sample analytics are presented as live data.
