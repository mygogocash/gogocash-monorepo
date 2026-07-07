# Bug hunt P1 checklist — staging

Use with **preview APK** + `https://api-staging.gogocash.co` (or dev API for B5).

## P0 regression (must pass)

- [ ] Home → Top Brands logos fill tile, cashback row readable
- [ ] Logged-out Wallet/Profile → login guard (`auth-guard.yaml`)
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
GOGOTRACK_AUTH_TOKEN=... npm run gototrack:preflight \
  -- --merchant-packages com.shopee.th --detect-package com.shopee.th
```

- [ ] Usage Access granted
- [ ] `POST /gototrack/settings` with `enabled: true`
- [ ] Activation nudge or background prompt observed on device
- [ ] Save report under `evidence/staging/T-*/preflight-report.json`

## Maestro smoke

```bash
cd apps/app
npm run bug-hunt:maestro
GOGOTRACK_AUTH_TOKEN=... npm run staging:maestro-wallet
```

## Ops — dev top brands (B5)

```bash
cd apps/api
MONGO_URI='mongodb://...' npm run seed:top-brands -- --force --limit 12
curl -s https://api.dev.gogocash.co/offer/top-brands | jq '.data | length'
```

## Admin — cashback labels

- [ ] Top Brands admin saves compact labels (`2.02%` not `Up to 2.02%`)
- [ ] API `GET /offer/top-brands` returns compact `cashback` strings
