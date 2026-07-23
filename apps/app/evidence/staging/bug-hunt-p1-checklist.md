# Bug hunt P1 checklist — staging

Use with **preview APK** + `https://api-staging.gogocash.co` (or dev API for B5).

**2026-07-09 handoff:** [`docs/android-bug-hunt-2026-07-09.md`](../../../docs/android-bug-hunt-2026-07-09.md)  
**Do not continue on APK versionCode 38** — OTA disabled; install EAS preview build `d263dfc2-9e93-4b72-9cef-34d96dfb43f1` (v39) first.  
Code fix on staging: `30630397`. Staging OTA published but only applies once updates are enabled in the APK.

## P0 regression (must pass)

- [ ] Home → Top Brands logos fill tile, cashback row readable
- [ ] Logged-out Wallet/Profile → login guard (`auth-guard.yaml` + `wallet-profile-auth-guard.yaml`) — **FAILED on APK 38; re-check on 39**
- [ ] Authenticated wallet shows dashboard for zero balance (not “No wallet activity yet”) — **FAILED on APK 38**
- [ ] Logged-out favorites → no 401 console noise
- [ ] Search suggestions / popover → live logos (not `GO` fallback)

## P1 discovery

- [ ] `/shops` and `/brand` directory logos on native
- [ ] Shop detail → Explore other shops uses live catalog logos
- [ ] Category detail grid renders compact BrandCard
- [ ] Quest → Explore other Shops 2-column grid + logos

## P1 profile

- [ ] Profile hub wallet hero matches API after profile load (username/wallet/tier)
- [ ] Account Settings → Appearance toggles System/Light/Dark without light leaks on profile/favorites/quest

## GoGoTrack device (Sprint 4)

```bash
cd apps/app
# Phase 7 needs --return-to-gototrack or the background-prompt check is skipped
GOGOTRACK_AUTH_TOKEN=... npm run gototrack:preflight \
  -- --api-url https://api-staging.gogocash.co \
  --merchant-packages com.shopee.th --detect-package com.shopee.th \
  --require-background-prompt --return-to-gototrack --require-foreground \
  --grant-usage-access
```

- [x] Usage Access granted (2026-07-09 Seeker)
- [x] `POST /gototrack/settings` with `enabled: true` (staging)
- [x] Detect / Shopee foreground PASS (2026-07-09)
- [ ] Activation nudge or background prompt observed on device (deferred — APK 39)
- [ ] Save report under `evidence/staging/T-*/preflight-report.json`

## Maestro smoke

```bash
cd apps/app
# Maestro 2.6: cookie subflow must declare appId (fixed in .maestro/subflows/)
npm run bug-hunt:maestro -- --udid SM02G4061912033
GOGOTRACK_AUTH_TOKEN=... npm run staging:maestro-wallet
```

- [x] home PASS (APK 38)
- [ ] auth-guard + wallet-profile-auth-guard PASS (need APK 39)
- [ ] staging:maestro-wallet PASS (need APK 39)

## Ops — dev top brands (B5)

```bash
cd apps/api
MONGO_URI='mongodb://...' npm run seed:top-brands -- --force --limit 12
curl -s https://api.dev.gogocash.co/offer/top-brands | jq '.data | length'
```

## Admin — cashback labels

- [ ] Top Brands admin saves compact labels (`2.02%` not `Up to 2.02%`)
- [ ] API `GET /offer/top-brands` returns compact `cashback` strings
