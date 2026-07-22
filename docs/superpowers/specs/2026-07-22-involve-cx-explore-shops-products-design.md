# Explore Shops & Products from Involve Asia (Commissions Xtra) — Design

- **Date:** 2026-07-22
- **Status:** Draft — awaiting two Involve portal inputs (see §11) and user review
- **Owner:** CTO (tech), Founder (partner-portal inputs)
- **Surfaces:** `apps/api` (Involve sync + serving), `apps/app` (Explore Shops, Explore Products)
- **Target env:** `production` branch → beta.gogocash.co first, then GCP prod

---

## 1. Goal

Serve **Explore Shops** and **Explore Products** from live Involve Asia data instead of demo fixtures, so both surfaces reflect real, monetizable inventory:

- **Shops** — the stores that sit *under* marketplaces (Lazada, Shopee, AliExpress, …).
- **Products** — real products *under* those marketplaces, sourced from **Commissions Xtra (CX)**.

The bar for "done": a user browsing Explore Products taps a real product, we mint a real Involve tracking link, and the click is attributable for cashback — no fictional SKUs anywhere.

## 2. Current state (verified 2026-07-22)

| Surface | Source today | Reality |
| --- | --- | --- |
| **Explore Shops** (`/shops`) | `CustomerShopDirectoryScreen` → `useDirectoryOfferSearch` / `useCustomerAccountResource<OfferListResponse>` → API `Offer` list | **Already live.** Offers are synced from Involve `/offers/all` by `InvolveProvider.syncOffers()` (cron). Grain = **advertiser/offer** (Lazada TH, Shopee TH, AliExpress, LG, Traveloka…). |
| **Explore Products** (`/discover`) | `CustomerProductDiscoveryScreen` → `webProductDiscovery` from `webDesignParity` (static) | **Demo fixtures.** No API call. Names ("Grocery Galaxy", "Pocket Pantry", "Glow Theory") are fictional. |

Backend Involve capabilities today (`apps/api/src/involve/involve.service.ts`):

- `POST /offers/all` — offer feed sync (advertiser grain).
- `POST /deeplink/generate` — mint tracking links (also fronted by app `mintUserTrackingLink`, hardened with an AbortController timeout in #583).
- `POST /conversions/all` + `/conversions/range` — conversion reconciliation.
- **No `/datafeed` / Commissions Xtra product endpoint is called anywhere.** ← the net-new gap.

Existing product model: `apps/api/src/catalog/schemas/catalog-product.schema.ts` (`catalog_products`) is an **admin-curated** catalog — variants, `draft/published/archived` status, an `offerId` ref to `Offer`. It is **not** Involve-synced. Its existence forces a data-model decision (§6).

## 3. Key insight — CX Datafeed powers both asks

The plain `/offers/all` feed has no concept of "a store under Lazada" — Lazada is a single advertiser. Store-level and product-level granularity live in **Commissions Xtra**. Therefore:

- **Explore Products** is served **directly** from the CX product datafeed.
- **"Shops under Lazada/Shopee"** are **derived** by aggregating the CX datafeed on its store/seller dimension (each product row carries a marketplace + seller/store).

One new data source (CX Datafeed) feeds both surfaces. The existing offer-based Explore Shops (marketplace/advertiser brands) stays as-is; the CX-derived stores are additive.

## 4. Scope

**In scope (v1)**
- New CX sync in `InvolveProvider`: pull the CX advertiser/marketplace list + product datafeed.
- Persist products (and derived stores) to Mongo.
- New API endpoints to serve Explore Products (and CX-derived shops) with the existing filter/sort/paginate contract (`OfferListResponse`-shaped where possible).
- Point `CustomerProductDiscoveryScreen` at the API, replacing `webProductDiscovery` fixtures.
- On-demand, cached deeplink minting for product/store clicks (quota-aware).
- Feature-flagged rollout; beta first.

**Out of scope (v1)**
- Rewriting the already-live offer-based Explore Shops.
- Merging CX products into the admin `catalog_products` curation workflow.
- Full-text product search infra (v1 uses the existing filter/sort surface).
- Real-time inventory/price accuracy guarantees (datafeed cadence only).

## 5. Architecture — Option A: sync → DB → serve (recommended)

```
Involve CX ──(cron sync)──▶ Mongo (involve_products, + derived involve_stores)
                                     │
                          API (filter / sort / paginate)
                                     │
                    apps/app Explore Products / Shops
                                     │
                click ──▶ on-demand deeplink mint (cached) ──▶ marketplace
```

**Why A over the alternatives**
- **Option B — proxy Involve live per request:** rejected. Adds Involve latency to every page load, couples uptime to theirs, and burns rate limit on browse traffic (violates Pillars 2 & 5).
- **Option C — client calls Involve directly:** rejected. Leaks the Involve key into the client bundle (Pillar 1) and is un-cacheable.

Option A keeps browse traffic sub-100ms off our own DB, decouples us from Involve availability, and confines Involve calls to a scheduled job + rare deeplink mints. Deeplinks are minted **on click, then cached**, never during sync — this is what respects the ~1,000 links/month cap (see §9).

## 6. Data model

**Decision D1 — where CX products live.** Recommended: a **dedicated `involve_products` collection**, separate from admin `catalog_products`.
- Keeps machine-synced feed data from clobbering hand-curated catalog (different lifecycles, different trust levels).
- `catalog_products` keeps its `draft/published/archived` curation semantics untouched.
- If curation of CX products is later wanted, we add a promotion path CX → catalog, not a merge.

`involve_products` (proposed):

| Field | Notes |
| --- | --- |
| `involveProductId` | unique, from datafeed — dedupe key |
| `marketplace` | "lazada" / "shopee" / … (advertiser) |
| `storeName` / `storeKey` | seller/store under the marketplace — the "shop" grain |
| `offerId` | ref `Offer` for the parent advertiser (cashback rate, T&C) |
| `title`, `description`, `imageUrl` | display |
| `price`, `salePrice`, `currency` | display |
| `commissionRate` / `cashbackRate` | from offer/CX |
| `categoryKey` | mapped to our category taxonomy |
| `trackingUrlTemplate` / `productUrl` | base URL for deeplink minting |
| `sourceHash`, `syncedAt`, `active` | sync bookkeeping / soft-delete of vanished rows |

**Derived stores.** Either a materialized `involve_stores` collection (aggregated on `storeKey`) refreshed by the sync, or an aggregation query at serve time. Recommended: **materialized** for sub-100ms serving (Pillar 2). Indexes: `{marketplace, storeKey}`, `{categoryKey, cashbackRate}`, text index on `title`/`storeName` if search is added.

## 7. Sync job

- New method on `InvolveProvider`, e.g. `syncCommissionsXtra()`, calling the CX endpoints (§11).
- Cadence: reuse the existing monthly offer-sync cron cadence to start (`@Cron` — offers already run `EVERY_1ST_DAY_OF_MONTH_AT_NOON`); add a **weekly** product refresh if the datafeed changes faster. Behind the same cron-gate invariant as existing jobs (`CRON_ENABLED`).
- **Upsert + soft-delete:** upsert by `involveProductId`; rows absent from the latest feed get `active=false` (never hard-delete — auditability + rollback).
- **Idempotent & paginated:** page through the datafeed; guard with the existing `PROVIDER_TIMEOUT_MS`; retry/backoff on transient failures.
- **Cost guard:** the datafeed pull is bulk (not per-product deeplink calls), so it does not touch the deeplink quota.

## 8. API — serving

- `GET /explore/products` — filter (`category`, `marketplace`, `cashbackMin`), sort (`popular|latest|highest_cashback`), paginate. Response shaped to the app's existing product-discovery contract so the screen swap is minimal.
- `GET /explore/stores` (or extend the shop directory) — the CX-derived stores, same filter/sort/paginate envelope as the current shop directory.
- Reuse the existing `OfferListResponse`/directory response conventions so `useDirectoryOfferSearch` / `useCustomerAccountResource` can drive Products the same way they already drive Shops.
- Validate all query params (Zero-Trust Input, Pillar 1); cap page size; index-backed queries only (Pillar 2).

## 9. Deeplinks & quota (the cost-critical path)

- The **~1,000 deeplinks/month** cap means we must **not** mint during sync.
- Mint **on click**, then **cache** the minted URL (per product/store + user-tracking segment) with a TTL, reusing the existing `/deeplink/generate` + `mintUserTrackingLink` path (already timeout-hardened, #583).
- Prefer marketplace-level or template-based tracking URLs where CX provides them, so most product clicks reuse one advertiser deeplink with product params appended — reserving true per-link mints for cases that require them.
- Emit a PostHog counter on every mint so we can watch the quota burn (Pillar 3 observability).

## 10. Cross-cutting

- **Feature flag:** gate the new Products data source behind an `EXPO_PUBLIC_ENABLE_*` flag following the existing contract (`value !== "0"`, unset = enabled) so we can dark-launch and instantly roll back. Fixture path stays as the fallback until the flag flips.
- **Observability:** PostHog events for product view / product click / deeplink mint (extends the existing `select_promotion`, `merchant_category_select` family); Sentry on sync + serve error paths (once the DSN lands, #544).
- **Testing (TDD):** unit — CX response mapping, category mapping, upsert/soft-delete, deeplink cache; integration — sync against a recorded CX fixture, serve endpoints with filter/sort/paginate; app — swap `CustomerProductDiscoveryScreen` to the API with a source-pinned parity test mirroring the existing `webProductDiscovery` shape. Real Involve responses recorded as fixtures (Pillar 4 — "real API or it didn't happen").
- **Rollback:** revert the flag; the fixture path resurfaces. DB rows are soft-deleted, never destructive (safe-migration Pillar 4).

## 11. Inputs required before implementation (external dependency)

These come from the Involve partner portal / CX docs and cannot be invented:

1. **CX advertiser/marketplace list** — the endpoint (or portal export) that says which advertisers are CX-enabled and how "stores under Lazada/Shopee" are exposed (a store dimension on the feed vs. a separate seller list). Request + response shape.
2. **CX product Datafeed** — the endpoint + auth, pagination model, and the exact product row schema (id, title, price/sale price, currency, image, category, marketplace, store/seller, commission rate, and the tracking/deeplink URL field). Request + response sample.

Once these land, the data model (§6) and mapping tests (§10) get pinned to the real shapes.

## 12. Open questions

- Which marketplaces for v1? (Lazada + Shopee only, or all CX advertisers?)
- Real deeplink quota on the current plan — confirm the ~1,000/mo figure and whether template links count against it.
- Datafeed size/refresh rate — decides monthly vs. weekly product sync and whether we need incremental sync.
- Category mapping — does CX expose categories that map cleanly to our taxonomy, or do we need a mapping table?

## 13. Rollout

1. Land sync + model + endpoints behind the flag (beta, flag off).
2. Run one CX sync; validate data in beta DB.
3. Flip the flag on beta; QA Explore Products against real inventory + one real deeplink click-through.
4. Watch PostHog (product clicks, deeplink mints/quota) + Sentry for 48h.
5. Promote to GCP prod.
