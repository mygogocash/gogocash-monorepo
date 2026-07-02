# GoGoTrack staging launch tracker

| Task | Description | Status | Evidence | Date |
|------|-------------|--------|----------|------|
| T-001 | Merge GoGoTrack to `staging` | pass | Fast-forward `origin/dev` → `staging`; push `7993fdd8..7bd27b18`; [Build (staging) run](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28523350158), [App OTA Staging](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28523349792) | 2026-07-01 |
| T-002 | DNS + infra audit (Railway vs Cloud Run) | pass | [`evidence/staging/T-002-dns-audit.txt`](../evidence/staging/T-002-dns-audit.txt) — staging on Railway edge (not Cloud Run); custom domains initially 404, later live | 2026-07-01 |
| T-003 | Launch tracker document | pass | This file | 2026-07-01 |
| T-004 | CI gate (GoGoTrack tests + typecheck + API lint) | pass | `test:gototrack` 31 files / 150 tests; `test:gototrack:api` 3 suites / 37 tests; `typecheck` OK; `lint:ci` OK (local on `staging` @ `7bd27b18`) | 2026-07-01 |
| T-005 | Railway staging services health | **pass** | **2026-07-01 ~14:52 UTC:** `GET https://api-staging.gogocash.co/health` → **200** `{"status":"ok"}`; `GET https://admin-staging.gogocash.co/` → **307** (sign-in redirect). Note: direct `i313nfy0.up.railway.app/health` still **404** — use custom domains. Earlier 404 resolved without agent Railway access (owner redeploy/wake). | 2026-07-01 |
| T-006 | Mongo `mongo-staging` RS health | **pass (standalone)** | [`evidence/staging/T-006-mongo-rs-check.txt`](../evidence/staging/T-006-mongo-rs-check.txt) — Railway SSH: `not running with --replSet` (standalone `mongo:8.3.4`, not RS). API + Shopee seed OK. Owner: enable RS only if withdraw/RS-only paths needed on staging. | 2026-07-02 |
| T-007 | GoGoTrack public API smoke (staging) | **pass** | [`evidence/staging/T-007-api-smoke.json`](../evidence/staging/T-007-api-smoke.json) — `/health` 200, `/gototrack/merchants` 200 `[]`, `/agent/v1/gototrack/merchants/search?q=shopee` 200 `type: gototrack_merchant_options`. Pre-seed empty array OK. | 2026-07-01 |
| T-008 | Seed merchants on Railway staging Mongo | **pass** | Seeded **Shopee** via `mongosh` on `mongo-staging` SSH into DB **`test`** (Mongoose default — `MONGO_URI` has no path). `GET /gototrack/merchants` → Shopee with `brand_id: brand-shopee`, `enabled: true`. Agent search returns Shopee match. **Note:** seed script not in prod Docker image; use `test.gogosense_merchants` or set `MONGO_URI` with `/gogocash`. | 2026-07-01 |
| T-009 | Submit iOS preview to TestFlight | **blocked** | Depends on T-014 pass. **Owner after T-014:** `gh workflow run deploy-app-native-eas.yml -f action=submit -f platform=ios -f profile=preview` or `cd apps/app && eas submit --profile preview --platform ios`. | 2026-07-01 |
| T-010 | Firebase authorized domains (staging) | **owner** | **Checklist (owner Firebase console):** authorize `app-staging.gogocash.co`, `admin-staging.gogocash.co`, `api-staging.gogocash.co` (if web OTP). GH `staging` env has `EXPO_PUBLIC_FIREBASE_*`. Confirm phone OTP on staging web or document workaround. Ref: [`docs/ios-dev-client.md`](ios-dev-client.md). | 2026-07-01 |
| T-011 | Play Console disclosures prep (Android) | pass | [`docs/gototrack-play-internal-checklist.md`](gototrack-play-internal-checklist.md) — FGS special-use, Data safety, internal track prep | 2026-07-01 |
| T-012 | EAS + store credentials preflight | **partial pass** | [`apps/app/eas.json`](../apps/app/eas.json) **preview**: `channel` **staging**, `EXPO_PUBLIC_API_URL` **https://api-staging.gogocash.co**, `EXPO_PUBLIC_APP_ENV` **staging**, `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE` **backend**. Repo secret **`EXPO_TOKEN`** present. GH **`staging` environment**: `EXPO_PUBLIC_FIREBASE_*` (4 vars). **Owner:** Apple internal-distribution + Google Play submit creds on expo.dev. | 2026-07-01 |
| T-013 | Admin-staging environment check | **partial — env misconfig** | Fix: [`docs/staging/gogocash-admin-railway-env.md`](staging/gogocash-admin-railway-env.md). Evidence: [`evidence/staging/T-013-admin-check.txt`](../evidence/staging/T-013-admin-check.txt) — `NEXT_PUBLIC_API_URL`/`NEXTAUTH_URL` point at production; **`NEXTAUTH_SECRET` missing**. | 2026-07-02 |
| T-014 | iOS preview EAS build (`profile=preview`) | **fail** | [`evidence/staging/T-014-ios-creds-check.txt`](../evidence/staging/T-014-ios-creds-check.txt) — re-verified 2026-07-02; still no iOS internal-distribution creds on EAS ([GH run 28523675003](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28523675003)). **Owner:** expo.dev → Credentials → iOS (Ad Hoc) → re-run preview iOS build workflow. | 2026-07-02 |
| T-015 | Android preview EAS build (`profile=preview`) | **pass** | [GH run 28559422060](https://github.com/mygogocash/gogocash-monorepo/actions/runs/28559422060) (~19 min); EAS [`5c57e3ef`](https://expo.dev/accounts/gogocash/projects/gogocash-mobile/builds/5c57e3ef-96fa-4bb9-8d98-dba0e40d9fc0) versionCode **18**. Fix: `SENTRY_DISABLE_AUTO_UPLOAD` on preview (`23e717d8`). Artifact: `gogocash-preview-android`. | 2026-07-02 |
| T-016 | Authenticated activate smoke (staging API) | **pass** | [`evidence/staging/T-016-activate.json`](../evidence/staging/T-016-activate.json) + re-smoke [`T-016-merchants-resmoke.json`](../evidence/staging/T-016-merchants-resmoke.json) (2026-07-02): Shopee in `/gototrack/merchants` + agent search. **Use backend JWT** for device QA. | 2026-07-02 |
| T-017 | Submit Android preview to Play internal | **blocked** | [`evidence/staging/T-017-play-submit-prep.txt`](../evidence/staging/T-017-play-submit-prep.txt) — T-015 APK ready; blocked on Play service account on expo.dev + `eas.json` `submit.preview` profile + T-011 console prep. **Owner:** configure creds then `gh workflow run deploy-app-native-eas.yml -f action=submit -f platform=android -f profile=preview`. | 2026-07-02 |
| T-018 | Android Phase 7 preflight (staging API) | **pass (23/23)** | Staging API + preview APK; Android 16 background prompt check uses `dumpsys notification --noredact` + `dumpsys activity services` (`GototrackMonitorService` / `gototrack_monitor`). Evidence: [`apps/app/evidence/staging/T-018-phase7-android16-fix/`](../apps/app/evidence/staging/T-018-phase7-android16-fix/). | 2026-07-02 |
| T-019 | iOS TestFlight smoke (manual) | **owner** | Depends on T-009 + T-008 + T-010. Install TestFlight build → Firebase login → GoGoTrack hub → activate → deeplink. Evidence → `evidence/staging/T-019-ios/`. | 2026-07-01 |
| T-020 | Admin ↔ beta app cross-check | **owner** | [`evidence/staging/T-020-admin-endpoints-prep.txt`](../evidence/staging/T-020-admin-endpoints-prep.txt) — endpoints documented (`PATCH /admin/update-offer/:id`, etc.). Blocked: T-013 env fix + admin login + T-017 or T-009 build on device. | 2026-07-02 |
| T-021 | Beta tester invites | **owner** | Depends on T-018 + T-019. Add TestFlight + Play internal testers; send onboarding doc. | 2026-07-01 |
| T-022 | Launch sign-off | **partial** | Automation pass 2026-07-02 — see **Sign-off summary** below. [PR #166](https://github.com/mygogocash/gogocash-monorepo/pull/166) merged; mobile CI green ([`T-022-pr166-ci.txt`](../evidence/staging/T-022-pr166-ci.txt)). Beta blocked on T-013 + T-014 + T-017. | 2026-07-02 |

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

## Sign-off summary (T-022) — 2026-07-02

**Ready for beta?** **Not yet** — Android device path green (T-018); blocked on admin env (T-013), iOS build (T-014), Play submit (T-017).

### Green (automation verified)

- Code on `staging`; [PR #166](https://github.com/mygogocash/gogocash-monorepo/pull/166) merged; **@gogocash/mobile CI gate pass**
- Staging API live: `/health` 200, Shopee in `/gototrack/merchants` + agent search ([T-016 re-smoke](../evidence/staging/T-016-merchants-resmoke.json))
- Mongo `mongo-staging` reachable (standalone, not RS — [T-006](../evidence/staging/T-006-mongo-rs-check.txt))
- Android preview EAS build pass (T-015); Phase 7 preflight 23/23 (T-018)
- Play disclosures prep doc (T-011); EAS preview config + `EXPO_TOKEN` (T-012 partial)

### Failed / blocked (owner action required)

| Priority | Task | Blocker |
|----------|------|---------|
| **P0** | T-013 | Fix Railway staging `gogocash-admin`: `NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co`, `NEXTAUTH_URL=https://admin-staging.gogocash.co`, set `NEXTAUTH_SECRET`; redeploy; login + DevTools |
| **P0** | T-014 | iOS Ad Hoc / internal distribution creds on expo.dev → re-run preview iOS EAS build |
| **P1** | T-017 | Google Play service account on EAS + `eas.json` `submit.preview` + Play Console (T-011) → submit Android preview |
| **P1** | T-010 | Firebase authorized domains for staging OTP ([checklist](../evidence/staging/T-010-firebase-domains-checklist.txt)) |
| **P2** | T-009 | TestFlight submit after T-014 green |
| **P2** | T-019–T-021 | iOS TestFlight smoke, admin cross-check (T-020), beta invites |

### Production planning

Defer production cutover until T-019/T-020 smoke + T-021 invites.

---

## Remaining owner actions (ordered)

1. **T-013 admin env (P0)** — Railway staging → `gogocash-admin` → set `NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co`, `NEXTAUTH_URL=https://admin-staging.gogocash.co`, `NEXTAUTH_SECRET`; redeploy; login + Platform dashboard screenshot → `evidence/staging/`.
2. **T-014 iOS creds (P0)** — expo.dev → iOS credentials (Ad Hoc/internal) → `gh workflow run deploy-app-native-eas.yml -f action=build -f platform=ios -f profile=preview`.
3. **T-017 Play submit (P1)** — expo.dev Google Play service account + add `submit.preview` in `eas.json` → `gh workflow run deploy-app-native-eas.yml -f action=submit -f platform=android -f profile=preview`.
4. **T-010 Firebase domains (P1)** — see [`evidence/staging/T-010-firebase-domains-checklist.txt`](../evidence/staging/T-010-firebase-domains-checklist.txt).
5. **T-009 TestFlight** — after T-014: `gh workflow run deploy-app-native-eas.yml -f action=submit -f platform=ios -f profile=preview`.
6. **T-019–T-021** — TestFlight smoke, admin ↔ app cross-check (T-020), beta tester invites.
