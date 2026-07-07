# GoGoCash — Bug Hunt Backlog (Phase 2)

> Post–Phase 1 adversarial sweep on local `staging` with all 23 Phase 1 fixes applied (uncommitted). Findings below are from direct code review after Phase 1 — **CONFIRMED** where the cited path was read; **UNVERIFIED** where behavior depends on runtime ordering not exercised in tests.

Baseline: Phase 1 complete (see `docs/BUG_HUNT_BACKLOG.md`). Repo: `apps/api`, `apps/admin`, `apps/app`.

## How to work this in Cursor

Same gates as Phase 1: TDD, `npm run test` + `npm run test:render` + `typecheck` (mobile), `npm test` (API). JS-only mobile → staging OTA; `eas.json` / native → EAS rebuild.

## Root-cause themes (Phase 2)

1. **Incomplete Phase 1 patterns** — `$regex` email fix landed in `withdraw.service.ts` but not in sibling `user.service.ts` MyCashback link path; Firebase `$` literals removed from `eas.json` but Sentry/PostHog still use the same anti-pattern.
2. **Fixture-as-initialData** — React Query `initialData` for payout methods shows hardcoded bank accounts until the server responds; same class as pre–Phase 1 withdraw fixtures.
3. **GoGoTrack activation ordering** — DB dedup index added in Phase 1, but `createAffiliate` still runs before insert; banner vs coordinator still use separate in-flight guards.

---

## Open findings

_All Phase 2 items fixed (local, uncommitted)._

### ~~1. [P1] `getBalanceMyCashback` uses unescaped, unanchored `$regex` on email~~ ✅ Fixed

- **Fix:** Anchored escaped regex + `isOwnedMyCashbackRecord` filter before aggregate (`user.service.ts`). Tests: `user.service.spec.ts`.

### ~~2. [P1] Payout methods React Query `initialData` seeds fixture bank accounts on backend~~ ✅ Fixed

- **Fix:** `initialData` only when `useFixtures`; backend uses `query.data ?? []` (`usePayoutMethods.ts`). Tests: `payout-methods.render.test.tsx`.

### ~~3. [P2] `eas.json` still inlines literal `$EXPO_PUBLIC_POSTHOG_*` / `$EXPO_PUBLIC_SENTRY_DSN`~~ ✅ Fixed

- **Fix:** Removed observability `$` placeholders from all `eas.json` profiles; EAS secrets + OTA GitHub env only. Contract test in `mobile-launch-contract.test.ts`. Docs: `sentry-native-eas.md`, `posthog-native-verification.md`.

### ~~4. [P2] Admin Platform Dashboard withdraw summary silently falls back to hardcoded mock on API error~~ ✅ Fixed

- **Fix:** `isRealApiConfigured()` gates mock fallback; real API errors surface via React Query error state. Tests: `dashboardQueries.test.ts`, `DashboardWithdrawSummary.test.tsx`.

### ~~5. [P2] GoGoTrack `activate()` calls Involve `createAffiliate` before DB insert~~ ✅ Fixed

- **Fix:** Reserve activation row (`deeplink: ''`) before Involve; `findByIdAndUpdate` on success; `deleteOne` rollback on Involve failure. E11000 on create → no Involve call.

### ~~6. [P2] GoGoTrack banner and prompt-coordinator use separate activation in-flight guards~~ ✅ Fixed

- **Fix:** Shared `activationMutex.ts` (`runExclusiveGoGoTrackActivation`) wired in `session.ts` + `promptCoordinator.ts`. Tests: `gototrack-activation-mutex.test.ts`.

### ~~7. [P2] Profile hero / menu wallet amount falls back to fixture `3,180.24` when `session.wallet` unset on native~~ ✅ Fixed

- **Fix:** `resolveProfileWalletAmount` + `useProfileWalletAmount` read wallet query cache (`POST /withdraw/check`) in backend mode; show `—` while loading, never fixture. Wired in `CustomerProfileBar`, `CustomerProfileMenu`, `CustomerProfileScreen`. Tests: `profile-wallet-amount.test.ts`.

### ~~8. [P2] `useGoGoTrackMerchants` still uses per-hook `useState` — no shared React Query cache~~ ✅ Fixed

- **Fix:** React Query with `gototrackMerchantsQueryKey`; clear on logout via `sessionQueryCacheBridge`.

### ~~9. [P3] Admin brand list search uses unescaped `$regex` on user input~~ ✅ Fixed

- **Fix:** `escapeRegexLiteral(dto.search.trim())` before `$regex` in `brand.service.ts`.

### ~~10. [P3] `CORS_EXTRA_ORIGINS` escape hatch undocumented in authoritative Railway matrix~~ ✅ Fixed

- **Fix:** Documented `CORS_EXTRA_ORIGINS` in `docs/railway-env-matrix.md` optional vars.

### ~~11. [P3] Withdraw screen keeps private `balance` `useState(3180.24)` parallel to wallet query~~ ✅ Fixed

- **Fix:** `resolveWithdrawAvailableBalance` derives balance from wallet query only in backend mode (`CustomerMoneyActionScreen.tsx`). Tests: `customer-money-action.render.test.tsx`.

### ~~12. [P3] `getBalanceMyCashback` builds `mobile` as `'0' + mobileData` without guarding empty `mobileData`~~ ✅ Fixed

- **Fix:** Validate normalized phone length before MyCashback phone branch (`user.service.ts`). Tests: `user.service.spec.ts`.

---

## Suggested fix order

1. ~~**#1** MyCashback email `$regex` in `user.service.ts`~~ ✅
2. ~~**#2** Payout methods `initialData`~~ ✅
3. ~~**#3** eas.json observability `$` literals~~ ✅
4. ~~**#5 + #6** GoGoTrack activation mutex + Involve ordering~~ ✅
5. ~~**#7** Profile hero wallet fixture~~ ✅
6. ~~**#4** Admin dashboard mock fallback~~ ✅
7. ~~Remaining P3 batch (#8–#12)~~ ✅

---

## Post-deploy backlog (ops + verification)

Code fixes shipped on `staging` (`9369694c`, `69d18414`). CI green. Items below are **not code bugs** — track until owner-verified.

### ~~P0 — Cloudflare R2 on Railway staging~~ ✅ Verified 2026-07-07

- **Check:** `GET https://api-staging.gogocash.co/offer/top-brands` — all logos use `https://media-staging.gogocash.co/...`; sample object GET **200** (~25 KB PNG). Zero GCS / `local-media` URLs in response.
- **Stack:** Cloudflare R2 (not GCP). Day-to-day vars on Railway `gogocash-api`: `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. See `docs/railway-env-matrix.md`.
- **Not re-checked:** fresh admin logo upload (needs admin JWT); GCP Secret Manager R2 secrets (only if using Cloud Run rollback lane).

### 1. [P1] Staging manual smoke — bug-hunt regression paths

- **Why:** Automated CI passed; user-visible paths below were not exercised on hosted staging after push.
- **Checklist:**
  1. **Payout** — create method → `/method` list → `/withdraw` selector → withdraw → wallet balance updates (no fixture `3,180.24`).
  2. **Profile hero** — header pill / profile hub shows real balance or `—`, not fixture amount.
  3. **GoGoTrack** — toggle on `/gototrack/settings`, back to permissions/hub — toggles match server.
  4. **Favorites** — heart tap while list still loading — optimistic state not reverted.
  5. **Referral** — explore-shop heart persists to `/favorite`.
  6. **Admin dashboard** — with real API, force/see API error → error state, not mock totals.
- **Hosts:** `https://app-staging.gogocash.co`, `https://admin-staging.gogocash.co`, `https://api-staging.gogocash.co`

### 2. [P2] EAS / observability secrets on expo.dev

- **Why:** `eas.json` no longer inlines `$EXPO_PUBLIC_FIREBASE_*` / Sentry / PostHog — native builds and OTA need EAS project secrets or GitHub staging env.
- **Verify:** `docs/firebase-native-eas.md`, `docs/sentry-native-eas.md`, `docs/posthog-native-verification.md`
- **Smoke:** crash/event appears in Sentry/PostHog after staging preview build or OTA.

### 3. [P2] GoGoTrack device acceptance (Phase 7)

- **Why:** Native monitor + background prompts need physical Android + EAS rebuild; not covered by unit/render tests.
- **Runbook:** `docs/gototrack-android-acceptance-plan.md`, `npm run gototrack:preflight -- --require-background-prompt`
- **Needs:** `EXPO_TOKEN`, `GOGOTRACK_AUTH_TOKEN` (backend JWT), Usage Access, `com.shopee.th`
- **Pre:** dedupe `gogosense_activation_events` `(user_id, detection_event_id)` before unique index sync on API boot.

### 4. [P3] Railway admin `NEXT_PUBLIC_API_URL` build-time confirm

- **Why:** Dockerfile no longer defaults to staging API — mis-set var → mock mode or wrong API host.
- **Verify:** Railway `gogocash-admin` service has `NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co` at **build** time.

### 5. [P3] Phase 3 adversarial sweep (optional)

- Re-run bug hunt on post-fix `staging` for regressions and new surface area.
- Seed new findings in a `BUG_HUNT_BACKLOG_PHASE3.md` if anything surfaces.

### Suggested order

1. **#1 Staging smoke** (highest leverage, ~30 min)
2. **#3 GoGoTrack device** (if demo/device QA is next milestone)
3. **#2 EAS secrets** (before next native EAS build)
4. **#4 admin build arg** (one-time Railway check)
5. **#5 Phase 3 sweep** (when smoke is green)

---

## Phase 1 regression watchlist

When fixing Phase 2, re-run:

- `apps/app/src/__tests__/payout-methods*.ts`
- `apps/app/src/__tests__/gototrack-*.ts`
- `apps/api/src/withdraw/withdraw.mycashback.spec.ts`
- `apps/api/src/gototrack/gototrack.service.spec.ts`
- `apps/app/src/__tests__/mobile-launch-contract.test.ts`
