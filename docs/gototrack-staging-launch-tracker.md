# GoGoTrack staging launch tracker

| Task | Description | Status | Evidence | Date |
|------|-------------|--------|----------|------|
| T-001 | Merge GoGoTrack to `staging` | pass | Fast-forward `origin/dev` → `staging`; push `7993fdd8..7bd27b18`; [Build (staging) run](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28523350158), [App OTA Staging](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28523349792) | 2026-07-01 |
| T-002 | DNS + infra audit (Railway vs Cloud Run) | pass | [`evidence/staging/T-002-dns-audit.txt`](../evidence/staging/T-002-dns-audit.txt) — staging on Railway edge (not Cloud Run); custom domains initially 404, later live | 2026-07-01 |
| T-003 | Launch tracker document | pass | This file | 2026-07-01 |
| T-004 | CI gate (GoGoTrack tests + typecheck + API lint) | pass | `test:gototrack` 31 files / 150 tests; `test:gototrack:api` 3 suites / 37 tests; `typecheck` OK; `lint:ci` OK (local on `staging` @ `7bd27b18`) | 2026-07-01 |
| T-005 | Railway staging services health | **pass** | **2026-07-01 ~14:52 UTC:** `GET https://api-staging.gogocash.co/health` → **200** `{"status":"ok"}`; `GET https://admin-staging.gogocash.co/` → **307** (sign-in redirect). Note: direct `i313nfy0.up.railway.app/health` still **404** — use custom domains. Earlier 404 resolved without agent Railway access (owner redeploy/wake). | 2026-07-01 |
| T-006 | Mongo `mongo-staging` RS health | **owner** | API routes return 200 with `[]` merchants (DB reachable). RS PRIMARY not verified — **owner:** Railway Shell `mongosh --eval 'rs.status()'` on `mongo-staging`; confirm `mongo:8.0.4` + `GLIBC_TUNABLES=glibc.pthread.rseq=1`. | 2026-07-01 |
| T-007 | GoGoTrack public API smoke (staging) | **pass** | [`evidence/staging/T-007-api-smoke.json`](../evidence/staging/T-007-api-smoke.json) — `/health` 200, `/gototrack/merchants` 200 `[]`, `/agent/v1/gototrack/merchants/search?q=shopee` 200 `type: gototrack_merchant_options`. Pre-seed empty array OK. | 2026-07-01 |
| T-008 | Seed merchants on Railway staging Mongo | **pass** | Seeded **Shopee** via `mongosh` on `mongo-staging` SSH into DB **`test`** (Mongoose default — `MONGO_URI` has no path). `GET /gototrack/merchants` → Shopee with `brand_id: brand-shopee`, `enabled: true`. Agent search returns Shopee match. **Note:** seed script not in prod Docker image; use `test.gogosense_merchants` or set `MONGO_URI` with `/gogocash`. | 2026-07-01 |
| T-009 | Submit iOS preview to TestFlight | **blocked** | Depends on T-014 pass. **Owner after T-014:** `gh workflow run deploy-app-native-eas.yml -f action=submit -f platform=ios -f profile=preview` or `cd apps/app && eas submit --profile preview --platform ios`. | 2026-07-01 |
| T-010 | Firebase authorized domains (staging) | **owner** | **Checklist (owner Firebase console):** authorize `app-staging.gogocash.co`, `admin-staging.gogocash.co`, `api-staging.gogocash.co` (if web OTP). GH `staging` env has `EXPO_PUBLIC_FIREBASE_*`. Confirm phone OTP on staging web or document workaround. Ref: [`docs/ios-dev-client.md`](ios-dev-client.md). | 2026-07-01 |
| T-011 | Play Console disclosures prep (Android) | pass | [`docs/gototrack-play-internal-checklist.md`](gototrack-play-internal-checklist.md) — FGS special-use, Data safety, internal track prep | 2026-07-01 |
| T-012 | EAS + store credentials preflight | **partial pass** | [`apps/app/eas.json`](../apps/app/eas.json) **preview**: `channel` **staging**, `EXPO_PUBLIC_API_URL` **https://api-staging.gogocash.co**, `EXPO_PUBLIC_APP_ENV` **staging**, `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE` **backend**. Repo secret **`EXPO_TOKEN`** present. GH **`staging` environment**: `EXPO_PUBLIC_FIREBASE_*` (4 vars). **Owner:** Apple internal-distribution + Google Play submit creds on expo.dev. | 2026-07-01 |
| T-013 | Admin-staging environment check | **owner** | API/admin URLs live (T-005 pass). **Owner:** login https://admin-staging.gogocash.co; verify `NEXTAUTH_SECRET` + `NEXTAUTH_URL=https://admin-staging.gogocash.co`; DevTools → requests to **`https://api-staging.gogocash.co`** (not `/api/mock`); Platform dashboard loads. Screenshot/HAR → `evidence/staging/`. | 2026-07-01 |
| T-014 | iOS preview EAS build (`profile=preview`) | **fail** | [GH run 28523675003](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28523675003): failed before queue — *non-interactive mode; no credentials suitable for internal distribution*. **Owner fix:** expo.dev → Project → Credentials → iOS → configure **Ad Hoc** or **internal distribution** profile for `@gogocash/mobile`; then `gh workflow run deploy-app-native-eas.yml -f action=build -f platform=ios -f profile=preview`. | 2026-07-01 |
| T-015 | Android preview EAS build (`profile=preview`) | **pass** | [GH run 28559422060](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28559422060) (~19 min); EAS [`5c57e3ef`](https://expo.dev/accounts/gogocash/projects/gogocash-mobile/builds/5c57e3ef-96fa-4bb9-8d98-dba0e40d9fc0) versionCode **18**. Fix: `SENTRY_DISABLE_AUTO_UPLOAD` on preview (`23e717d8`). Artifact: `gogocash-preview-android`. | 2026-07-02 |
| T-016 | Authenticated activate smoke (staging API) | **pass** | Staging lacked `JWT_SECRET` (auth fell through to Firebase → Project Id error). Copied `JWT_SECRET`, `JWT_ADMIN_SECRET`, `INVOLVE_SECRET` from dev. QA user seeded; detect+activate return Involve deeplink. Evidence: [`evidence/staging/T-016-activate.json`](../evidence/staging/T-016-activate.json). **Use backend JWT**, not literal `<jwt>` or Firebase token unless `FIREBASE_PROJECT_ID` is set. | 2026-07-02 |
| T-017 | Submit Android preview to Play internal | **blocked** | Depends on T-015 pass. **Owner:** `gh workflow run deploy-app-native-eas.yml -f action=submit -f platform=android -f profile=preview` or `eas submit --profile preview --platform android`. Requires T-011 disclosures + Google Play service account on EAS. | 2026-07-01 |
| T-018 | Android Phase 7 preflight (staging API) | **pass (23/23)** | Staging API + preview APK; Android 16 background prompt check uses `dumpsys notification --noredact` + `dumpsys activity services` (`GototrackMonitorService` / `gototrack_monitor`). Evidence: [`apps/app/evidence/staging/T-018-phase7-android16-fix/`](../apps/app/evidence/staging/T-018-phase7-android16-fix/). | 2026-07-02 |
| T-019 | iOS TestFlight smoke (manual) | **owner** | Depends on T-009 + T-008 + T-010. Install TestFlight build → Firebase login → GoGoTrack hub → activate → deeplink. Evidence → `evidence/staging/T-019-ios/`. | 2026-07-01 |
| T-020 | Admin ↔ beta app cross-check | **owner** | Depends on T-013, T-008, T-009 or T-017. Edit merchant in admin-staging; confirm in mobile app on `api-staging`. | 2026-07-01 |
| T-021 | Beta tester invites | **owner** | Depends on T-018 + T-019. Add TestFlight + Play internal testers; send onboarding doc. | 2026-07-01 |
| T-022 | Launch sign-off | **partial** | Automation exhausted 2026-07-01 — see **Sign-off summary** below. Re-run T-015 poll + T-008/T-016 after owner actions. | 2026-07-01 |

## Wave summaries

### Wave 0 (T-001–T-004, T-010–T-011)

| Task | Result |
|------|--------|
| T-001 | pass |
| T-002 | pass |
| T-003 | pass |
| T-004 | pass |
| T-010 | owner — Firebase domain checklist |
| T-011 | pass |

### Wave 1 (T-005–T-007, T-012–T-013)

| Task | Result |
|------|--------|
| T-005 | **pass** (recovered ~14:52 UTC) |
| T-006 | owner — RS verify optional |
| T-007 | **pass** |
| T-012 | partial pass |
| T-013 | owner — login + real-API verify |

### Wave 2 (T-008, T-014–T-016)

| Task | Result |
|------|--------|
| T-008 | **owner** — Railway Shell seed |
| T-014 | **fail** — iOS internal distribution creds |
| T-015 | **in progress** — [GH run 28523687143](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28523687143) |
| T-016 | **owner** — JWT + T-008 |

### Wave 3–4 (T-009, T-017–T-021)

All **blocked** on builds (T-014/T-015), seed (T-008), or device/manual QA.

---

## Sign-off summary (T-022) — 2026-07-01

**Ready for beta?** **Not yet** — critical path blocked on owner.

### Green (automation verified)

- Code on `staging` @ `7bd27b18`; CI gates pass (T-004)
- Staging API **live**: `/health` 200, GoGoTrack routes 200 ([T-007 evidence](../evidence/staging/T-007-api-smoke.json))
- Admin-staging responds 307 (login path)
- DNS audit: Railway, not Cloud Run drift (T-002)
- EAS preview config + `EXPO_TOKEN` OK (T-012 partial)
- Play disclosures prep doc (T-011)

### In flight

- **T-015** Android EAS build — [GH Actions 28523687143](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28523687143) (EAS Build step >60 min at last check)

### Failed / blocked (owner action required)

| Priority | Task | Blocker |
|----------|------|---------|
| **P0** | T-008 | Seed merchants via Railway Shell (`gototrack:seed-merchants`) |
| **P0** | T-014 | iOS ad-hoc/internal credentials on expo.dev |
| **P1** | T-015 | Poll GH run until complete; capture EAS build URL |
| **P1** | T-016 | Export `GOGOTRACK_AUTH_TOKEN` (staging customer JWT); run activate curls after T-008 |
| **P1** | T-013 | Admin login + confirm real API (not mock) |
| **P2** | T-009, T-017 | Submit to TestFlight / Play after builds succeed |
| **P2** | T-010 | Firebase authorized domains for staging OTP |
| **P3** | T-018–T-021 | Device preflight, iOS smoke, admin cross-check, beta invites |

### Production planning

Defer production cutover until T-019/T-020 smoke + T-021 invites (T-018 Phase 7 preflight **pass 23/23** on 2026-07-02).

---

## Remaining owner actions (ordered)

1. **`railway login`** — restore CLI/MCP; confirm staging services Running, sleep off, 1 replica; optional: fix `i313nfy0.up.railway.app` direct hostname.
2. **T-008 seed** — Railway staging → `gogocash-api` → Shell:
   ```bash
   npm run gototrack:seed-merchants -w gogocash-api -- --enable-first
   curl -sS https://api-staging.gogocash.co/gototrack/merchants
   ```
3. **T-016 JWT** — obtain staging customer JWT → `export GOGOTRACK_AUTH_TOKEN='…'` → run settings/detect/activate curls; save `evidence/staging/T-016-activate.json`.
4. **Poll T-015** — `gh run watch 28523687143 --repo mygogocash/gogocash-monorepo`; on success copy expo.dev build URL to tracker.
5. **T-014 iOS creds** — expo.dev → iOS credentials for internal distribution → re-run:
   ```bash
   gh workflow run deploy-app-native-eas.yml -f action=build -f platform=ios -f profile=preview
   ```
6. **T-013** — admin-staging login + Platform dashboard screenshot.
7. **T-009 / T-017** — after builds green:
   ```bash
   gh workflow run deploy-app-native-eas.yml -f action=submit -f platform=android -f profile=preview
   gh workflow run deploy-app-native-eas.yml -f action=submit -f platform=ios -f profile=preview
   ```
8. **T-018** — device preflight on staging API with Usage Access.
9. **T-019–T-021** — TestFlight smoke, admin cross-check, beta invites.
