# Explore Shops & Products from Involve Asia — Design (rev 2)

- **Date:** 2026-07-22 · **Revised:** 2026-07-24 (rev 2 — pinned to the real Involve Publisher API)
- **Status:** Ready for dev review. Architecture + data model pinned to the live API contract (`api.involve.asia/docs`). One remaining external step: request a Publisher API key (§14).
- **Owner:** CTO (tech), Founder (partner-portal inputs)
- **Surfaces:** `apps/api` (Involve sync + serving), `apps/app` (Explore Shops, Explore Products, optional Deals)
- **Target env:** `production` branch → beta.gogocash.co first, then GCP prod

> **rev 2 changed the premise.** rev 1 assumed a "Commissions Xtra product datafeed API". That API does not exist. The real Involve API exposes **Shopee Commission Xtra shops** (`/shopeextra/all`), offers, campaigns/vouchers, conversions, and deeplink minting — but **no product-level endpoint**. Product-level data is only available as per-advertiser **Datafeed Manager files** (heavier, gated, advertiser-specific schema). v1 therefore ships the API-native **Shopee Xtra shops** surface + **vouchers**; real products move to a v2 file-feed track. See §3.

---

## 1. Goal

Serve **Explore Shops** and (v2) **Explore Products** from live Involve Asia data instead of demo fixtures, so both surfaces reflect real, monetizable inventory.

**v1 (this spec):**
- **Explore Shops — boosted "Xtra" shops under Shopee**, sourced directly from `/shopeextra/all` (mall/preferred sellers under Shopee TH, with a real boosted commission rate). Additive to the already-live offer/advertiser Explore Shops.
- **Deals/Vouchers** — active promo codes + campaign banners from `/campaigns/all` (voucher surface or badges on shops).

**v2 (separate track):**
- **Explore Products** — real per-product rows (price, image, product URL) from per-advertiser **Datafeed Manager** files. Deferred because there is no product API and each advertiser's feed schema differs (§3, §4).

"Done" bar for v1: a user browsing Explore Shops sees real Shopee Xtra sellers with real boosted rates, taps one, and the click is attributable for cashback via a real Involve tracking link — no fictional stores anywhere.

## 2. Current state (verified 2026-07-24 against the codebase)

| Surface | Source today | Reality |
| --- | --- | --- |
| **Explore Shops** (`/shops`) | `CustomerShopDirectoryScreen` → `useCustomerAccountResource<OfferListResponse>('brandCatalog')` → `GET /offer` + `useDirectoryOfferSearch` → `GET /offer?...&search=` | **Already live.** Offers synced from Involve `/offers/all` by the offer sync (`apps/api/src/involve/involve.service.ts` `findAll()`). Grain = **advertiser/offer** (Lazada TH, Shopee TH, AliExpress…). |
| **Explore Products** (`/discover`) | `CustomerProductDiscoveryScreen` → `getProductDiscoveryResults(webProductDiscovery…)` from `apps/app/src/design/webDesignParity.ts` | **Product grid = demo fixtures** (fictional SKUs: "Grocery Galaxy", "Pocket Pantry", "Glow Theory"). Note: the screen already fetches `categoryList` + `productDiscoveryBanner` live — only the product grid is fixtures. |

Backend Involve capabilities today (`apps/api/src/involve/involve.service.ts`):
- `POST /offers/all` — offer feed sync (advertiser grain) into the `offers` collection.
- `POST /deeplink/generate` — mint tracking links; durably cached in the `Deeplink` collection (`apps/api/src/involve/schemas/deeplink.schema.ts`) with dedup by `destination_hash` and a distributed reservation state machine.
- `POST /conversions/all` + `/conversions/range` — conversion reconciliation.
- **No `/shopeextra`, `/campaigns`, or any product/datafeed call exists** — the net-new gap.

Existing product model: `apps/api/src/catalog/schemas/catalog-product.schema.ts` (`catalog_products`) is an **admin-curated** catalog (variants, `draft/published/archived`, `offer_id` ObjectId ref to `Offer`). Not Involve-synced. Keep it separate (§6).

## 3. Key insight — what the Involve API actually exposes (verified from `api.involve.asia/docs`)

Base `https://api.involve.asia/api` · Bearer JWT (2h TTL) · **60 req/min/account** · envelope `{status,message,data:{page,limit,count,nextPage,data:[...]}}` · max page 100 (`/shopeextra/all`: 200). Endpoints: `/authenticate`, `/offers/all`, `/offers/last-updated-range`, `/conversions/{all,range,data-range}`, `/campaigns/all`, `/deeplink/generate`, `/shopeextra/all`.

1. **There is no product-level API.** No endpoint returns product rows (price/image/product-url). **Explore Products cannot be built from the API.** Product data exists only as per-advertiser **Datafeed Manager** file URLs (dashboard → Tools → Datafeed Manager), which require per-advertiser approval + datafeed enablement and have **advertiser-specific schemas** (no standard). → v2 file-feed track.
2. **"Commissions Xtra" in the API = `/shopeextra/all` = Shopee boosted-payout _shops_**, not products. Shop-grain, Shopee-only, TH supported. This *is* the "shops under a marketplace" ask, and it is directly API-native → **v1**.
3. **`/shopeextra/all` already returns a ready `tracking_link` per shop** → for v1 we largely **avoid `/deeplink/generate` and its 1,000/30-day cap** (§9).
4. **`/campaigns/all` exposes vouchers** (`voucher_code`) + banners + seasonal windows → a Deals surface / voucher badges (maximize).
5. **`/offers/all` has server-side `sort_by=highest_commision_percent`** and a fixed **category vocabulary** (`Electronics|Fashion|Finance|Health & Beauty|Lifestyle|Marketplace|Other|Services|Travel`) → real cashback sort + a category mapping source for the existing offer-based shops (maximize).
6. **`/offers/last-updated-range`** → incremental delta sync (maximize; keeps the 60 req/min budget safe).

## 4. Scope

**In scope (v1)**
- Sync `/shopeextra/all` (Shopee Xtra shops, TH) → persist to a new `involve_shops` collection.
- Sync `/campaigns/all` (`coupons_only`) → persist vouchers/deals to `involve_campaigns`.
- New serving endpoints reusing the `GET /offer` envelope + filter/sort/paginate.
- Point Explore Shops (or an "Xtra shops" section) at the API; add an "Xtra" boosted-cashback badge.
- Optional Deals surface / voucher badges from `involve_campaigns`.
- Wire the existing offer-based shops to `/offers/all` server-side `highest_commision_percent` sort + category mapping.
- Incremental offer sync via `/offers/last-updated-range`.
- Feature-flagged rollout; beta first.

**Out of scope (v1 → v2)**
- **Explore Products** (per-advertiser Datafeed Manager file pipeline).
- Merging into the admin `catalog_products` curation workflow.
- Full-text search infra (v1 reuses the existing filter/sort surface).
- Real-time price/inventory guarantees.

## 5. Architecture — sync → DB → serve

```
Involve API ──(cron sync)──▶ Mongo (involve_shops, involve_campaigns)
   /shopeextra/all                        │
   /campaigns/all              API (filter / sort / paginate, offer envelope)
   /offers/last-updated-range             │
                              apps/app Explore Shops / Deals
                                          │
              tap ──▶ existing shop mint path (or pre-minted tracking_link) ──▶ marketplace
```

Rejected alternatives (unchanged from rev 1): **B — live-proxy per request** (adds Involve latency + couples uptime + burns the 60 req/min budget on browse traffic); **C — client calls Involve** (leaks the key into the bundle, un-cacheable). Option A keeps browse sub-100ms off our own DB and confines Involve calls to scheduled jobs.

## 6. Data model

**Decision D1 — dedicated collections, separate from admin `catalog_products`** (different lifecycle + trust level; machine-synced must not clobber hand-curated). Follow the `catalog-product.schema.ts` Nest `@Schema`/`@Prop`/`SchemaFactory` + post-factory `.index()` pattern; register via `MongooseModule.forFeature`.

### `involve_shops` — pinned to the real `/shopeextra/all` row
Sample row: `{shop_id:1234567, shop_name:"Apple Authorised Reseller", shop_type:"mall", shop_link:"https://shopee.com.my/apple_my", shop_image:"…jpg", shop_banner:[], offer_name:"Shopee Malaysia", country:"Malaysia", period_start_time:"2026-05-01", period_end_time:"2026-06-30", commission_rate:"0.0150", tracking_link:"https://invl.me/aff_m?offer_id=577&aff_id=13972&source=ia_api_shopeextra&url=…"}`

| Field | Source | Notes |
| --- | --- | --- |
| `source` | const `'involve_shopeextra'` | source-scope for upsert/soft-delete, mirrors `Offer.source` convention |
| `shopId` | `shop_id` | dedupe key (unique with `source`) |
| `marketplace` | const `'shopee'` | derived (endpoint is Shopee-only) |
| `shopName` | `shop_name` | display + text search |
| `shopType` | `shop_type` | `mall` / `preferred` → badge |
| `shopLink` | `shop_link` | destination (whitelisted Shopee domain) |
| `shopImage` | `shop_image` | logo |
| `shopBanner` | `shop_banner[]` | optional banners |
| `parentOfferName` | `offer_name` | e.g. "Shopee Thailand" — used to resolve `offerId` |
| `offerId` | resolved | **ObjectId `ref:'Offer'`** — look up the synced Shopee `Offer` by `offer_name`+country (matches `catalog_products.offer_id` convention; NOT the numeric `offer_id`) |
| `country` | `country` | v1 filter to Thailand |
| `cashbackRate` | `parseFloat(commission_rate)` | **scalar** (0.0150 → 1.5%) — server sort/filter field |
| `commissionRateRaw` | `commission_rate` | audit |
| `periodStart` / `periodEnd` | `period_start_time` / `period_end_time` | campaign window; expire when past `periodEnd` |
| `trackingLink` | `tracking_link` | **pre-minted** affiliate URL (see §9) |
| `categoryKey` | mapped | see category map below (may be null for Xtra shops — no category on the row) |
| `sourceHash`, `syncedAt`, `active` | sync bookkeeping | soft-delete of vanished rows |

Indexes: `{source, shopId}` unique · `{marketplace, country, active}` · `{cashbackRate:-1}` · text on `shopName`.

### `involve_campaigns` — pinned to the real `/campaigns/all` row
Fields carried: `campaign_banner_id`, `offer_id` (numeric), `merchant_id`, `offer_name`, `campaign_name`, `description`, `voucher_code`, `date_campaign_start`, `date_campaign_end`, `banner_image_url`, `tracking_link`, `categories`, `with_banner`. Persist as `involve_campaigns` (dedupe `campaignBannerId`), resolve `offerId` ObjectId ref like above, `active` gated on the campaign date window. Serve as a Deals surface or join to `involve_shops`/offers for voucher badges.

### Category mapping (`/offers/all` + `/campaigns/all` `categories` → `CATEGORY_ICON_KEYS`)
Net-new table (no canonical taxonomy exists; `CATEGORY_ICON_KEYS` is an icon enum): `Electronics→electronics · Fashion→fashion · Finance→finance · Health & Beauty→beauty · Lifestyle→home · Marketplace→shopping · Other→default · Services→services · Travel→travel`. `/shopeextra/all` rows have no category → `categoryKey` may be null (badge by `shopType` instead).

**Currency:** `/offers/all` currency is upstream free-form; normalize to ISO-3 uppercase on ingest (catalog convention enforces `/^[A-Z]{3}$/`). Shopee Xtra rows carry no currency (rate is a fraction) — TH ⇒ THB by convention.

## 7. Sync jobs

New sync methods (NOT on the `AffiliateNetworkProvider` port — it is offers/mint/refresh only; add a dedicated `CommissionsXtraSyncService` or extend the port):
- `syncShopeeXtra()` — page `/shopeextra/all` (`filters[country]=Thailand`, `limit:200`, loop while `page*limit<count`), upsert `involve_shops` by `shopId`, resolve `offerId`, compute `cashbackRate`.
- `syncCampaigns()` — page `/campaigns/all` (`filters[coupons_only]=true`), upsert `involve_campaigns`.
- `syncOffersIncremental()` — `/offers/last-updated-range` for delta offer sync (replaces/augments the monthly full `/offers/all`).

Conventions to follow (verified):
- **Cron gate:** `@Cron(...)` guarded by `if (!isLegacyCronEnabled()) return;` in a `TasksService` (pattern: `apps/api/src/offer/tasksService.ts` + `common/legacy-cron-gate.ts`). Shopee Xtra: nightly (docs recommend nightly refresh). Campaigns: daily. Offers: keep monthly full + optional daily incremental.
- **Explicit timeout:** sync calls have **no timeout today** (`PROVIDER_TIMEOUT_MS=10_000` wraps only auth + deeplink). Add a timeout to the new calls.
- **Config:** the Involve base URL is hardcoded `https://api.involve.asia/api`. Reuse it; register any new secret in `apps/api/src/config/env.config.ts` (precedent: `INVOLVE_SECRET`). Auth = `POST /authenticate {key,secret}` → cache the JWT (existing pattern), `Authorization: Bearer {token}`, re-auth on 401.
- **Idempotent upsert + soft-delete:** upsert by dedupe key; rows absent from the latest feed get `active=false`. **Empty-result guard** before any bulk disable (pattern: `involve.service.ts:1630` — a `$nin:[]` would disable the whole set on a transient empty response).
- **Rate budget:** 60 req/min/account is shared across ALL Involve calls (offer sync, conversions, these). Page sequentially with backoff on 429 (250→500→1000ms).

## 8. API — serving

Reuse the **`GET /offer` response envelope** `{page,limit,total,totalPages,data}` (the app hooks `useCustomerAccountResource<OfferListResponse>` already consume it) — NOT the `GET /catalog/products` bare-array.

- `GET /explore/shops` — Shopee Xtra shops. Filters: `country` (default Thailand), `shopType` (mall|preferred), `cashbackMin`, `search`. Sort: `highest_cashback` (on `cashbackRate`), `latest` (on `syncedAt`/`periodStart`). Drop `popular` (no server-side popularity signal yet).
- `GET /explore/deals` (optional) — active `involve_campaigns` (voucher/banner), filter `category`, paginate.
- **Validation:** typed `@Query()` DTO + global `ValidationPipe` (no zod in this repo) with `@Max(100)` page cap. Precedent: `apps/api/src/catalog/dto/catalog.dto.ts` + the `Math.min(limit, cap)` idiom. Do **not** copy `GET /offer` which reads raw `request.query` with no cap.
- Index-backed queries only.

## 9. Deeplinks & attribution (much lighter than rev 1)

- **`/shopeextra/all` and `/campaigns/all` rows already include `tracking_link`** — a ready affiliate URL. For v1, **do not mint per shop.** For per-user cashback attribution, append the sub-ID the codebase already uses (`aff_sub=user_id:{userId}`) to the returned `trackingLink` at click time. This **avoids the 1,000-unique-links / rolling-30-day cap** for the entire Xtra surface.
- Where a custom destination *is* needed (e.g. deep into a product page not covered by the shop link), reuse the existing durable path — `createAffiliateForUser` → `/deeplink/generate` → `Deeplink` cache + reservation (`involve.service.ts`; app `mintUserTrackingLink`, AbortController 2500ms). Constraints: `offer_id` REQUIRED (unknown → HTTP 500); `url` must be a **whitelisted domain of the offer** (else HTTP 500). Lazada deeplinks bypass the `s.laz.com` redirect (Involve changelog 2025-06-04).
- **Cap confirmed:** `/deeplink/generate` = 1,000 unique links / rolling 30-day / account. Emit a PostHog counter on any real mint to watch burn (net-new — no counter exists today).
- **Tap UX:** product/shop tap continues to route to the existing Shop/Brand Detail screen (`apps/app/src/screens/CustomerShopDetailScreen.tsx`), which owns the mint/redirect. No new client mint path in v1.

## 10. App integration

- **New `CustomerAccountResourceId` member** (`apps/app/src/account/customerAccountResourceIds.ts`) + branch in `resolveCustomerAccountResourceEndpoint` (`customerAccountResourceEndpoints.ts`) pointing at `GET /explore/shops`.
- **New mapper** `mapExploreShopsToDirectoryStores` producing the `BrandDirectoryStore` shape the directory already renders (reuse `mapOffersToCatalogBrands`' cashback-display derivation for consistency). Add the "Xtra" badge from `shopType`/boosted rate.
- **Feature flag** `EXPO_PUBLIC_ENABLE_INVOLVE_XTRA_SHOPS` following the `resolveFeatureEnabled(value)=value!=="0"` contract (`config/featureFlags.ts`), fixtures/existing-offer path as fallback until flip.
- **Routing:** existing `shops`/`discover` tabs — no new route. Shop card `href` keeps the `/shop/...` route → mint on Shop Detail.

## 11. Observability

- **PostHog only.** **Sentry is NOT wired in `apps/api`** (rev 1's "#544 DSN" reference is dropped). Use the global `AnalyticsService` (`apps/api/src/analytics/analytics.service.ts`) with PDPA-safe coarse props (pattern: `conversion-ingest.service.ts:81`).
- App: unpark `product_view` / `shop_view` / `shop_click` in `apps/app/src/analytics/events.ts:6-10` (currently parked until live data); add `trackXxx` helpers mirroring `trackPromotionSelect` + call sites. Existing family: `select_promotion`, `merchant_category_select`.
- Sync + serve error paths: Nest `Logger` (current convention).

## 12. Testing (TDD — "real API or it didn't happen")

- **Unit:** `/shopeextra/all` row → `involve_shops` mapping; `commission_rate` → `cashbackRate` parse; category mapping; currency normalization; campaign date-window `active`; upsert + empty-guard soft-delete; `aff_sub` append to `trackingLink`.
- **Integration:** sync against a **recorded real `/shopeextra/all` fixture** (capture once the API key lands); `GET /explore/shops` filter/sort/paginate + page cap.
- **App:** parity test that `mapExploreShopsToDirectoryStores` output matches the `BrandDirectoryStore` shape the screen expects; flag-off falls back cleanly.

## 13. Rollout

1. Land sync + models + `/explore/shops` (+ `/explore/deals`) behind the flag (beta, flag off).
2. Run one Shopee Xtra sync (TH); validate `involve_shops` in beta DB.
3. Flip the flag on beta; QA Explore Shops against real Xtra inventory + one real click-through (verify attribution via a conversion).
4. Watch PostHog (shop views/clicks; deeplink mints/quota if any) + logs for 48h.
5. Promote to GCP prod.
6. **v2:** scope the per-advertiser Datafeed Manager product pipeline as its own spec.

## 14. Remaining external inputs

1. **Publisher API key** — request at `app.involve.asia/v2/publisher/api-keys` (Tools → API), ~48h approval → `key` + `secret`. Blocks live sync. Note: the current `My Advertiser` list shows 0 approved advertisers — confirm the account is approved for **Shopee TH** so `/shopeextra/all` returns TH rows.
2. **One recorded `/shopeextra/all` TH response** — to pin the integration fixture (schema is already pinned from docs; confirm TH-specific fields/rate format).
3. **v2 only:** per-advertiser Datafeed Manager access + one advertiser's feed file + its schema/guide.

## 15. Developer resources (Involve ships these)
- OpenAPI 3.1 spec + **Postman v2.1 collection** (`https://api.involve.asia/docs/collection.json`) — import to codegen DTOs / hit endpoints (auth auto-captures the token).
- `https://api.involve.asia/llms.txt` — flat API index; per-endpoint markdown at `/docs/endpoints/<slug>.md`.
- Official Claude Skill (SKILL.md) bundling auth/pagination/gotchas.

---

## Appendix — verified codebase integration map (2026-07-24)
- **Backend:** `apps/api/src/involve/involve.service.ts` (auth/token cache, `/offers/all`, `/deeplink/generate`, durable `Deeplink` cache + reservation); `apps/api/src/affiliate/{affiliate-provider.interface.ts, affiliate-sync.util.ts, affiliate-provider.registry.ts}`; `apps/api/src/offer/tasksService.ts` + `apps/api/src/common/legacy-cron-gate.ts` (cron gate); `apps/api/src/config/env.config.ts`; `apps/api/src/offer/offer.controller.ts` (envelope precedent); `apps/api/src/catalog/dto/catalog.dto.ts` (DTO+`@Max(100)` precedent); `apps/api/src/analytics/analytics.service.ts`. **New:** `involve_shops` + `involve_campaigns` schemas + `explore` module/controller + `CommissionsXtraSyncService`.
- **App:** `apps/app/src/screens/discovery/CustomerShopDirectoryScreen.tsx`, `apps/app/src/account/{customerAccountResourceIds.ts, customerAccountResourceEndpoints.ts, useDirectoryOfferSearch.ts, directoryCatalogResource.ts}`, `apps/app/src/api/catalogTypes.ts` (`OfferListResponse`), `apps/app/src/api/affiliateDeeplink.ts` (`mintUserTrackingLink`), `apps/app/src/screens/CustomerShopDetailScreen.tsx`, `apps/app/src/analytics/events.ts`, `apps/app/src/config/featureFlags.ts`.
- **Corrections applied from rev 1:** no product API (products→v2 file feeds); "CX"=`/shopeextra/all` shops; Sentry not wired (PostHog only); deeplink cache already durable (reuse, no new TTL cache); `tracking_link` pre-minted (avoid the 1,000/30d cap in v1); offerId = ObjectId ref not numeric; `GET /offer` has no page cap (use catalog DTO precedent); category vocabulary + `highest_commision_percent` sort exist server-side.
