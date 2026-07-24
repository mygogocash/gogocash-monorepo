# Involve Xtra Shops + Vouchers (v1) — Detailed Requirements

- **Date:** 2026-07-24
- **Parent design:** `2026-07-22-involve-cx-explore-shops-products-design.md` (rev 2), PR #586
- **Status:** Requirements draft for dev handoff — pending sign-off
- **Scope:** v1 only (Shopee Commission Xtra shops + vouchers via the Involve Publisher API). Products (per-advertiser datafeed files) = v2, not covered here.

Requirement IDs: `REQ-<area>-<n>`. Each carries **AC** (acceptance criteria — testable). Areas: `DEP` deps/blockers · `CFG` config · `DM` data model · `SYNC` sync · `ATTR` attribution · `API` serving · `APP` app · `OBS` observability · `SEC` security/privacy · `FLAG` rollout · `TEST` tests.

---

## 0. Glossary
- **Xtra shop** — a Shopee seller enrolled in Shopee Commission Xtra with a boosted commission rate, returned by `POST /shopeextra/all`.
- **Offer** — advertiser/marketplace grain already synced from `POST /offers/all` into the `offers` collection.
- **Deeplink / tracking link** — an `invl.me` affiliate URL that attributes a click for cashback.
- **Envelope** — Involve's list response `{status,message,data:{page,limit,count,nextPage,data:[...]}}`.

---

## 1. Dependencies & blockers

- **REQ-DEP-1** Publisher API key + secret obtained from `app.involve.asia/v2/publisher/api-keys` (Tools → API), ~48h approval.
  - **AC:** `INVOLVE_SECRET` (or a CX-specific secret, see REQ-CFG-1) resolves a JWT via `POST /authenticate`; a manual smoke call to `/shopeextra/all` returns HTTP 200.
- **REQ-DEP-2** Account is approved for **Shopee Thailand** so `/shopeextra/all?filters[country]=Thailand` returns rows.
  - **AC:** a recorded live TH response contains ≥1 shop with `country` = Thailand and a non-empty `tracking_link`. (Current `My Advertiser` shows 0 approved advertisers — must be resolved.)
- **REQ-DEP-3** One real `/shopeextra/all` TH response is recorded as a test fixture (JSON) before integration tests are considered passing.
  - **AC:** fixture committed under the api test fixtures dir; integration test loads it (no live call in CI).

> Code (schemas, sync service, endpoints, app wiring, unit tests) MAY be written before REQ-DEP-1/2 land, validated against the pinned schema. Live verification and REQ-DEP-3 gate "done".

---

## 2. Configuration (`CFG`)

- **REQ-CFG-1** Involve auth reuses the existing pattern: `POST /authenticate {key, secret}` → Bearer JWT cached ~2h, re-auth on 401. Base URL `https://api.involve.asia/api` (already hardcoded in `apps/api/src/involve/involve.service.ts`).
  - **AC:** no new base-URL env needed; the CX sync reuses the existing token cache. If a separate CX credential is required, register it in `apps/api/src/config/env.config.ts` alongside `INVOLVE_SECRET` (do not read `process.env` ad hoc).
- **REQ-CFG-2** New request timeout for CX/campaign sync calls (the existing sync calls have none; `PROVIDER_TIMEOUT_MS=10_000` wraps only auth + deeplink).
  - **AC:** each `/shopeextra/all` and `/campaigns/all` request has an explicit timeout; a hung request aborts and is logged, not left pending.
- **REQ-CFG-3** Cron cadence values are gated by the existing `isLegacyCronEnabled()` invariant (`apps/api/src/common/legacy-cron-gate.ts`).
  - **AC:** with `CRON_ENABLED=false` no CX sync runs; the manual admin trigger still works.

---

## 3. Data model (`DM`)

### 3.1 `involve_shops` collection (new)
Nest `@Schema({collection:'involve_shops', timestamps:true})` + `@Prop` + `SchemaFactory` + post-factory `.index()`; register via `MongooseModule.forFeature`. Template: `apps/api/src/catalog/schemas/catalog-product.schema.ts`.

- **REQ-DM-1** Fields + mapping from the `/shopeextra/all` row (schema pinned; see parent spec §6):

  | Field | Type | Source | Rule |
  | --- | --- | --- | --- |
  | `source` | string const `'involve_shopeextra'` | — | source-scope for upsert/soft-delete |
  | `shopId` | number | `shop_id` | dedupe key |
  | `marketplace` | string const `'shopee'` | — | endpoint is Shopee-only |
  | `shopName` | string | `shop_name` | required, trimmed |
  | `shopType` | enum `'mall'\|'preferred'` | `shop_type` | drives badge |
  | `shopLink` | string | `shop_link` | must be http(s); Shopee domain |
  | `shopImage` | string | `shop_image` | optional |
  | `shopBanner` | string[] | `shop_banner` | default `[]` |
  | `parentOfferName` | string | `offer_name` | e.g. "Shopee Thailand" |
  | `offerId` | ObjectId ref `Offer` | resolved | REQ-DM-3 |
  | `country` | string | `country` | v1 = Thailand |
  | `cashbackRate` | number | `parseFloat(commission_rate)` | REQ-DM-2 |
  | `commissionRateRaw` | string | `commission_rate` | audit |
  | `periodStart` | Date | `period_start_time` | |
  | `periodEnd` | Date | `period_end_time` | used for `active` window |
  | `trackingLink` | string | `tracking_link` | pre-minted (ATTR) |
  | `categoryKey` | string\|null | mapped | REQ-DM-4; null allowed |
  | `sourceHash` | string | derived | change detection |
  | `syncedAt` | Date | sync time | |
  | `active` | boolean | sync | soft-delete flag |

- **REQ-DM-2** `cashbackRate` is a numeric fraction parsed from `commission_rate` (e.g. `"0.0150"` → `0.015`). Display percent = `cashbackRate * 100`.
  - **AC:** unit test: `"0.0150"→0.015`; malformed/empty → row rejected + logged, not stored as `NaN`.
- **REQ-DM-3** `offerId` resolves to the ObjectId `_id` of the synced Shopee `Offer` matched by `parentOfferName` (+ country), NOT the numeric `offer_id`.
  - **AC:** when a matching `Offer` exists, `offerId` is set; when none, `offerId` is null and the row is still stored (surfaced in logs). A product/shop card can navigate to that Offer's shop-detail route.
- **REQ-DM-4** `categoryKey` maps via a static table to `CATEGORY_ICON_KEYS`. `/shopeextra/all` rows carry no category → `categoryKey` = null; badge by `shopType` instead. (Table applies to offers/campaigns: `Electronics→electronics, Fashion→fashion, Finance→finance, Health & Beauty→beauty, Lifestyle→home, Marketplace→shopping, Other→default, Services→services, Travel→travel`.)
  - **AC:** every `/offers/all` + `/campaigns/all` category string maps to a valid `CATEGORY_ICON_KEYS` member or `default`; unknown → `default` + logged.
- **REQ-DM-5** Indexes: unique `{source, shopId}`; `{marketplace, country, active}`; `{cashbackRate:-1}`; text `{shopName}`.
  - **AC:** duplicate `shopId` upserts (no dupes); serving queries are index-backed (explain shows no COLLSCAN).
- **REQ-DM-6** `active` window: a row is served only when `active===true` AND now ≤ `periodEnd`.
  - **AC:** a shop past `periodEnd` is excluded from serving even if `active` was true at sync.

### 3.2 `involve_campaigns` collection (new)
- **REQ-DM-7** Persist `/campaigns/all` rows (fields: `campaignBannerId`←`campaign_banner_id`, `offerIdNumeric`←`offer_id`, `merchantId`←`merchant_id`, `offerName`, `campaignName`, `description`, `voucherCode`←`voucher_code`, `dateStart`←`date_campaign_start`, `dateEnd`←`date_campaign_end`, `bannerImageUrl`←`banner_image_url`, `trackingLink`, `categoryKey` (mapped from `categories`), `withBanner`, `offerId` resolved ObjectId, `active`, `syncedAt`, `sourceHash`).
  - **AC:** dedupe by `campaignBannerId`; `active` gated on `dateStart ≤ now ≤ dateEnd`.
- **REQ-DM-8** `involve_shops` / `involve_campaigns` are SEPARATE from admin `catalog_products` (no writes to it).
  - **AC:** grep shows no CX sync path writing `catalog_products`.

---

## 4. Sync jobs (`SYNC`)

- **REQ-SYNC-1** `syncShopeeXtra()` in a new `CommissionsXtraSyncService` (NOT on the `AffiliateNetworkProvider` port — it is offers/mint/refresh only).
  - Request: `POST /shopeextra/all` `filters[country]=Thailand`, `filters[sort_type]=default`, `limit=200`, page from 1.
  - **AC:** pages while `page*limit < count`; all TH rows upserted into `involve_shops`.
- **REQ-SYNC-2** `syncCampaigns()`: `POST /campaigns/all` `filters[coupons_only]=true` (optionally `filters[country]=Thailand`), `limit=100`, paged. Upsert `involve_campaigns`.
  - **AC:** only campaigns with a `voucher_code` are stored when `coupons_only` is set; date-window respected.
- **REQ-SYNC-3** Idempotent upsert by dedupe key; rows absent from the latest full feed set `active=false` (soft-delete, never hard-delete).
  - **AC:** a shop removed upstream flips to `active=false` on next sync and stops serving; it is not deleted.
- **REQ-SYNC-4** **Empty-result guard**: if a sync page-loop yields zero ids, DO NOT run the bulk `active=false` pass (pattern: `involve.service.ts:1630`).
  - **AC:** a transient empty response does not disable the entire `involve_shops` set.
- **REQ-SYNC-5** Cadence (all gated by `isLegacyCronEnabled()`): Shopee Xtra **nightly**; campaigns **daily**; optional offer delta via `/offers/last-updated-range`.
  - **AC:** `@Cron` methods exist in a `TasksService`; disabled when the gate is off.
- **REQ-SYNC-6** Rate/robustness: shared **60 req/min/account** budget across all Involve calls; on 429 back off 250→500→1000ms; on 401 re-auth once and retry; per-request timeout (REQ-CFG-2).
  - **AC:** simulated 429 triggers backoff; simulated 401 triggers one re-auth+retry then gives up.
- **REQ-SYNC-7** Manual trigger for QA reuses the existing admin task-trigger pattern (`apps/api/src/tasks/tasks.controller.ts`), guarded by the same admin auth.
  - **AC:** an admin can force a CX sync on beta on demand.

---

## 5. Attribution / deeplink (`ATTR`)

- **REQ-ATTR-1** v1 uses the **pre-minted `trackingLink`** on each `involve_shops` / `involve_campaigns` row — NO call to `/deeplink/generate` for these surfaces.
  - **AC:** no `/deeplink/generate` call is made during Xtra-shop browsing or click; the 1,000-unique/30-day cap is untouched.
- **REQ-ATTR-2** Per-user attribution appends the existing sub-ID convention (`aff_sub=user_id:{userId}`) to `trackingLink` at click time.
  - **AC:** the outbound URL for a logged-in user contains `aff_sub=user_id:<id>`; for a guest, a defined guest/default sub is applied (product decision REQ-OPEN-3).
- **REQ-ATTR-3** Where a custom destination is genuinely needed (out of v1 scope for Xtra shops), reuse the existing durable path (`createAffiliateForUser` → `Deeplink` cache + reservation; app `mintUserTrackingLink`). `url` must be a whitelisted offer domain (else HTTP 500); resolve `offer_id` first (unknown → HTTP 500).
  - **AC:** documented as the only sanctioned mint path; not exercised by v1 Xtra shops.

---

## 6. Serving API (`API`)

Reuse the **`GET /offer` envelope** `{page,limit,total,totalPages,data}` (app hooks consume it). Typed `@Query()` DTO + global `ValidationPipe`, `@Max(100)` page cap (precedent `apps/api/src/catalog/dto/catalog.dto.ts`).

- **REQ-API-1** `GET /explore/shops`.
  - Query: `country` (default `Thailand`), `shopType` (`mall|preferred`), `cashbackMin` (number), `search` (string), `page` (≥1, default 1), `limit` (default 20, max 100), `sort` (`highest_cashback|latest`, default `highest_cashback`).
  - Behavior: only `active` + in-window rows (REQ-DM-6); `cashbackMin` filters on `cashbackRate`; `search` on `shopName`.
  - **AC:** each param validated + capped; invalid param → 400; response is the envelope; results index-backed; p95 serve < 100ms off our DB.
- **REQ-API-2** `GET /explore/deals` (vouchers).
  - Query: `category`, `page`, `limit` (max 100). Returns active `involve_campaigns` in the envelope.
  - **AC:** only in-window campaigns returned; `voucher_code`, `bannerImageUrl`, `trackingLink` present per row.
- **REQ-API-3** Response rows expose only display-safe fields (no secrets/internal ids beyond what the app needs); mirror the public-projection discipline of `GET /offer`.
  - **AC:** response contains no API secret, no raw token, no internal reservation state.
- **REQ-API-4** Errors: unknown/invalid query → 400 with a validation message; empty result → 200 with `data:[]` + `total:0` (never 404).
  - **AC:** covered by controller spec.

---

## 7. App (`APP`) — `apps/app`

- **REQ-APP-1** New `CustomerAccountResourceId` member (e.g. `exploreXtraShops`) in `apps/app/src/account/customerAccountResourceIds.ts` + a branch in `resolveCustomerAccountResourceEndpoint` (`customerAccountResourceEndpoints.ts`) → `GET /explore/shops`.
  - **AC:** `useCustomerAccountResource<OfferListResponse>('exploreXtraShops')` fetches the endpoint; types compile.
- **REQ-APP-2** New mapper `mapExploreShopsToDirectoryStores` producing the `BrandDirectoryStore` shape the directory already renders; reuse the cashback-display derivation used by `mapOffersToCatalogBrands`.
  - **AC:** parity test — mapper output matches the `BrandDirectoryStore` fields the screen consumes.
- **REQ-APP-3** "Xtra" boosted-cashback badge on shops (`shopType`/boosted `cashbackRate`).
  - **AC:** a shop with `shopType='mall'` (or boosted rate) renders the Xtra badge; a non-Xtra shop does not.
- **REQ-APP-4** Feature flag `EXPO_PUBLIC_ENABLE_INVOLVE_XTRA_SHOPS` following `resolveFeatureEnabled(value)=value!=="0"` (`apps/app/src/config/featureFlags.ts`); flag off → current offer/fixture path unchanged.
  - **AC:** flag unset/`"1"` → Xtra source; flag `"0"` → existing path; documented as a web build ARG.
- **REQ-APP-5** Shop card `href` keeps the existing `/shop/...` route → mint/redirect on `CustomerShopDetailScreen`. No new client mint path.
  - **AC:** tapping an Xtra shop lands on the existing Shop Detail flow; redirect uses REQ-ATTR-2.
- **REQ-APP-6** Deals surface (optional in v1): render `involve_campaigns` (voucher code + banner) OR badge shops with an active voucher. Placement is a product decision (REQ-OPEN-2).
- **REQ-APP-7** Fallback: on API error/empty with flag on, fall back to the existing behavior (no blank screen).
  - **AC:** simulated API 500 → screen shows existing offer-based shops, not an error state.

---

## 8. Observability (`OBS`)
- **REQ-OBS-1** PostHog only (Sentry is NOT wired in `apps/api`). Emit via the global `AnalyticsService` with PDPA-safe coarse props.
  - **AC:** events `shop_view`, `shop_click` (and `deal_view`/`voucher_copy` if deals ship) emitted; unpark item-level events in `apps/app/src/analytics/events.ts:6-10`; props contain no PII.
- **REQ-OBS-2** Sync emits a completion event/metric (rows upserted, rows soft-deleted, duration) for monitoring.
  - **AC:** each sync run logs a structured summary; a zero-row run is visibly flagged.

---

## 9. Security & privacy (`SEC`)
- **REQ-SEC-1** API secret/token never leaves the server; not in the app bundle, logs, or API responses (Pillar 1).
  - **AC:** grep of app bundle + API responses shows no secret/token.
- **REQ-SEC-2** All `/explore/*` query params validated (zero-trust); page size capped (REQ-API-1/2).
- **REQ-SEC-3** Attribution sub-ID carries only `user_id:<id>` (already used); no additional PII in `aff_sub`.
  - **AC:** outbound tracking URL contains no email/name/etc.

---

## 10. Feature flag & rollout (`FLAG`)
- **REQ-FLAG-1** Land behind `EXPO_PUBLIC_ENABLE_INVOLVE_XTRA_SHOPS` (app) — backend endpoints may ship always-on (data gated by the flag on the client) or behind a server flag; pick one and document.
- **REQ-FLAG-2** Rollout: beta flag-off → run one sync → validate beta DB → flag-on beta → QA one real click-through + confirm a conversion → watch PostHog 48h → GCP prod.
  - **AC:** each gate has a named owner + a pass/fail check.
- **REQ-FLAG-3** Rollback = flip the flag; DB rows are soft-deleted only (no destructive migration).

---

## 11. Tests (`TEST`)
- **REQ-TEST-1** Unit: `/shopeextra/all` row → `involve_shops` mapping; `commission_rate`→`cashbackRate`; category map; `offerId` resolution (hit + miss); upsert + empty-guard soft-delete; `active` window; `aff_sub` append.
- **REQ-TEST-2** Integration: sync against the recorded TH fixture (REQ-DEP-3); `GET /explore/shops` + `GET /explore/deals` filter/sort/paginate + page-cap + 400 on bad params.
- **REQ-TEST-3** App: mapper parity to `BrandDirectoryStore`; flag-off fallback; badge render.
- **REQ-TEST-4** No live Involve call in CI (fixtures only). "Real API or it didn't happen" satisfied by recording real responses as fixtures.
  - **AC:** CI passes offline; a documented script records/refreshes fixtures against the live API.

---

## 12. Definition of done (v1)
1. All `REQ-*` AC pass (unit + integration + app), CI green offline.
2. One live Shopee TH sync on beta populates `involve_shops` with real rows.
3. Flag-on beta: Explore Shops shows real Xtra shops with Xtra badges + correct cashback %.
4. One real click-through from an Xtra shop produces an attributable conversion (verified via `/conversions/*`).
5. PostHog shows `shop_view`/`shop_click`; 48h clean.
6. Promoted to GCP prod behind the flag.

---

## 13. Open product decisions (need founder input — do not block coding)
- **REQ-OPEN-1** Do Xtra shops appear as a **section within the existing Explore Shops** list, a **separate tab/filter**, or **merged + badged**?
- **REQ-OPEN-2** Vouchers/deals: dedicated **Deals surface**, **badges on shops**, or **both**? Ship in v1 or fast-follow?
- **REQ-OPEN-3** Guest (logged-out) attribution: what `aff_sub` value for anonymous clicks (drop cashback vs a guest bucket)?
- **REQ-OPEN-4** Cashback display: show the raw boosted `commission_rate`, or the user-facing cashback after our margin? (Affects the mapper.)
- **REQ-OPEN-5** Countries beyond Thailand for the Xtra surface (SG/ID/etc. are supported by the endpoint) — v1 TH only, confirm.

---

## 14. Out of scope (v2+)
- Explore **Products** via per-advertiser Datafeed Manager files (own spec).
- Merge into admin `catalog_products` curation.
- Full-text product search infra.
- Lazada "shops under marketplace" (no API equivalent to `/shopeextra/all`).
