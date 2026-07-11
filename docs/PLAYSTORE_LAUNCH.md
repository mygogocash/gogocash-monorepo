# Google Play launch runbook — co.gogocash.app

Audited 2026-07-11 (4-dimension readiness audit: build config, Play policy
compliance, production infra, store assets). This file is the single list of
what remains, who owns it, and in what order. Update it as items close.

## Status at a glance

| # | Item | Owner | Severity | Status |
|---|------|-------|----------|--------|
| 1 | Production Firebase project + google-services secret | Founder (console) | **Blocker** | ☐ |
| 2 | Account deletion is a no-op — real backend flow + web URL | Repo (next PR) | **Blocker** | ☐ |
| 3 | GoGoTrack `PACKAGE_USAGE_STATS` gated out of store builds | Repo | **Blocker** | ✅ this PR |
| 4 | Android App Links (intentFilters + assetlinks.json) | Repo + Founder (SHA) | Required | ✅ config in this PR / ☐ SHA |
| 5 | Production profile: backend data + Sentry upload off | Repo | Required | ✅ this PR |
| 6 | CI: production env separation, AAB artifacts, channel dropdown | Repo | Required | ✅ this PR |
| 7 | Play Console account, first manual AAB upload, submit creds | Founder (console) | Required | ☐ |
| 8 | Store listing: copy, screenshots, feature graphic, icon | ✅ drafted in `apps/app/store/play/` — founder review | Required | ◐ |
| 9 | Data safety form + Financial features declaration | Founder (inventory below) | Required | ☐ |
| 10 | Reviewer login credentials (App access) | Founder | Required | ☐ |
| 11 | Legal URLs live check (privacy/terms) | Founder | Required | ☐ |
| 12 | Production deploy workflows for api/app/admin (Cloud Run) | Repo (separate track) | Required for launch traffic | ☐ |
| 13 | Sentry/PostHog production keys (crash + analytics) | Founder (EAS secrets) | Recommended | ☐ |

## 1. Production Firebase (blocker)

The repo's committed `apps/app/google-services.json` is the **gogocash-staging**
project. A production build today would ship staging Firebase (phone OTP against
staging). Do once:

1. Firebase console → create/open the production project → add Android app
   `co.gogocash.app` → download its `google-services.json`.
2. Enable the same auth providers as staging (Phone, Email/Password, Google).
3. `eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file`
   with that file (app.config.js already resolves `GOOGLE_SERVICES_JSON` before
   falling back to the committed staging file).
4. Add the production SHA-256 (from Play App Signing, see §4) to the Firebase
   Android app so phone OTP's SafetyNet/Play Integrity works.

## 2. Account deletion (blocker — Play policy)

Google Play requires apps with account creation to offer **in-app deletion**
and a **public web deletion URL**. Today the "Request account deletion" button
(`CustomerAccountSettingsScreen.tsx`) shows a success toast and does nothing,
and `apps/api` has no user-facing deletion endpoint.

Planned implementation (next PR, TDD):
- `apps/api`: session-bound deletion endpoint (`DELETE /user` or a PDPA
  data-subject-request flow) — needs the founder's call on **semantics**:
  hard-delete vs. deactivate + retention window (Thai PDPA + financial-record
  retention for paid cashback favor a 30-day soft-delete with anonymization).
- `apps/app`: wire the existing button; surface the flow under Profile →
  Account Setting (it is currently buried at the `/language` route).
- Web: a public page (e.g. `app.gogocash.co/account-deletion`) for the Data
  safety form's deletion URL.

**Founder decision needed:** deletion semantics (above) before the API PR.

## 3. GoGoTrack usage-access (blocker — handled)

`PACKAGE_USAGE_STATS` is a restricted permission: Play demands a declaration
form with core-functionality justification and rejects most apps that carry it.
This PR gates the plugin: production builds ship **without** it; dev/staging
keep it. To ship GoGoTrack in the store build later: set
`EXPO_PUBLIC_ENABLE_GOTOTRACK=1` on the production profile **and** complete the
Play permissions declaration (in-app prominent disclosure + demo video), plus a
`FOREGROUND_SERVICE_SPECIAL_USE` service declaration the plugin doesn't add yet.

## 4. Android App Links

This PR adds `autoVerify` intent filters for `app.gogocash.co` and
`app-staging.gogocash.co`, and serves `/.well-known/assetlinks.json` from the
web export with a **placeholder fingerprint**. After the first Play upload:

1. Play Console → Setup → App signing → copy the **App signing key certificate**
   SHA-256.
2. Replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FROM_PLAY_CONSOLE` in
   `apps/app/public/.well-known/assetlinks.json` (add the upload-key SHA too if
   sideloaded builds should verify).
3. Redeploy the web app; verify with
   `https://developers.google.com/digital-asset-links/tools/generator`.

## 5–6. Build & CI contract (handled in this PR)

- `eas.json` production: `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend` (live data at
  launch — **flag if you intended otherwise**), `SENTRY_DISABLE_AUTO_UPLOAD=true`
  until Sentry creds exist.
- Target API pinned to 36 via expo-build-properties (Play requires 35+).
- `deploy-app-native-eas.yml`: production dispatches now run in the `production`
  GitHub environment (create it in repo Settings → Environments and add the
  `EXPO_PUBLIC_FIREBASE_*` production values before the first production OTA);
  the channel input is a dropdown; production artifacts are archived as `.aab`.

## 7. Play Console mechanics (updated 2026-07-11 from the live console)

Console reality check (founder screenshots):
- The developer account is a **personal account** (ID 7809578781158392361) →
  Google requires a **closed test with ≥12 testers running continuously for
  14 days** before production access can even be requested. **This is the
  longest lead-time item on the whole launch — start the clock first.**
- The one existing Play app is **`co.gogocash.app.staging`** (Draft, internal
  testing since May 2026). The store app must be a **new app entry** for the
  production package **`co.gogocash.app`** — package names are permanent, and
  the staging entry stays as the internal-distribution channel.
- Android developer verification: already complete ✅.

Critical path to start the 14-day clock:
1. Fastest clock start: the **`closedtest` EAS profile** builds a
   store-uploadable AAB on coherent staging config (staging API + the
   committed staging Firebase, which already registers `co.gogocash.app`) —
   no production Firebase needed. Dispatch deploy-app-native-eas.yml with
   profile=closedtest. Swap in a production-config AAB before the
   production-track release; the 14-day clock counts testers, not builds.
2. Or the full-production path: §1 Firebase first, then
   `eas build --profile production --platform android`.
3. Play Console → **Create app** (`GoGoCash`, App, Free, Shopping) for
   `co.gogocash.app` → **the first AAB upload is manual**.
4. Closed testing → create track → select countries (TH at minimum) → add a
   12+ tester email list → roll out → get testers to opt in and install.
   The 14 days count while the test stays live with 12+ testers.
5. Store listing + Data safety + content rating (§8–§9) can be completed in
   parallel during the 14 days; production access application comes after.
6. `eas submit` works after the app exists + a Google Play **service-account
   JSON** is attached via `eas credentials` (submit track is `internal` in
   eas.json — promote in the console).

## 8. Store listing

**Console-ready assets now live in `apps/app/store/play/`** (2026-07-11):
512×512 icon, 1024×500 feature graphic, five 1080×1920 screenshots captured
from the device, and `LISTING.md` with en-US + th-TH copy ready to paste.
Review/replace with designed versions any time — specs are already correct.
Splash remains 240×240 — consider a ≥1024px source asset eventually.

Copy drafts (edit freely):
- **Short (≤30 chars)** en: `Cashback on every purchase` · th: `เงินคืนทุกการช้อป`
- **Full description** skeleton: what GoGoCash is (cashback on Shopee/Lazada/
  Traveloka + 100s of brands), how it works (copy link → paste → shop & earn),
  GoGoLink, withdraw to PromptPay/bank, referral rewards. Localize to th-TH
  (catalog strings in `src/messages/th.json` are a good source).

## 9. Data safety + declarations

Declare as **collected** (encrypted in transit, account-bound):
- Personal info: phone number (OTP auth), email (email/password auth), name/avatar.
- Financial info: payout details (PromptPay ID / bank account) for withdrawals.
- App activity: only if GoGoTrack ships (it does NOT in this first build).
- Analytics/crash: only if PostHog/Sentry keys are set for production (§13) —
  today they are empty, so answer "not collected" unless you add them.
- Data deletion: link the §2 web deletion URL.

Also complete:
- **Financial features declaration** (the app handles user payout info).
- **Content rating (IARC)**: Shopping app, no UGC/gambling/violence; users can
  spend money at external merchants; GoGoPass (฿49/mo) — note it is billed
  outside Google Play today. **Digital-goods policy check:** if GoGoPass is a
  digital subscription consumed in-app, Play may require Google Play Billing —
  confirm GoGoPass's nature before answering, or exclude it from the Android
  build's purchase paths.
- **Ads**: none (declare "no ads") unless affiliate placements count — they are
  content, not ad SDKs; declare no ad SDKs.

## 10. Reviewer access

The app requires login. Create a dedicated review account:
- Easiest: email/password account (flow shipped in #194) — enter the
  credentials in Play Console → App access with step-by-step login notes.
- If phone OTP must be reviewable: add a Firebase **test phone number** with a
  fixed OTP in the production Firebase project.

## 11. Legal URLs (verify they resolve)

Hardcoded in the app: `gogocash.co/privacy-policy`, `gogocash.co/term-of-use`
(singular!), `gogocash.co/terms-of-service`. The marketing site is a separate
repo — click all three before submitting; a 404 in front of a reviewer is an
instant rejection. The privacy policy URL also goes in the store listing.

## 12. Production runtime traffic

All Cloud Run deploy workflows are staging-only today; production
(api/app/admin.gogocash.co) is deployed outside this repo's CI. Before launch
traffic: decide whether to add production deploy workflows (mirroring the
staging ones with a `production` GitHub environment + prod WIF) or keep the
current out-of-band process. The mobile production build points at
`api.gogocash.co` — smoke-test auth + offers + withdraw against it with a
production-profile build before submitting.

## 13. Observability (recommended before launch)

Production builds currently ship with **no crash reporting and no analytics**
(`sentryDsn`/`posthogKey` empty). Create the production Sentry project & PostHog
key, add `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_POSTHOG_KEY` /
`EXPO_PUBLIC_POSTHOG_HOST` to the EAS production environment, then remove
`SENTRY_DISABLE_AUTO_UPLOAD` and add `SENTRY_AUTH_TOKEN` so source maps upload.
Launching blind on crashes is how store ratings die.

## Suggested order

1. §1 Firebase prod + §2 deletion decision (unblock the two hard blockers)
2. Repo: account-deletion PR (§2) — I build this once semantics are decided
3. §7 console setup → internal testing build → §4 SHA into assetlinks
4. §8–§11 listing + forms + review account (parallel with 3)
5. §13 observability, then promote internal → closed → production
