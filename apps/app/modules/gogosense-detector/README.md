# gogosense-detector (local Expo module)

Android-only native module that backs GoGoSense's foreground-app detection via
`UsageStatsManager`. It implements the `GoGoSenseDetector` contract consumed by
`src/gogosense/*` (adapter → selector → session → hook → screen).

**Scope (MVP, locked):** UsageStats only — `start/stopDetection` are no-ops and the
JS layer drives the foreground-only loop. No NotificationListenerService, no
screenshot capture, no always-on foreground service (all deferred).

## Why it isn't built/verified by CI or the JS suite

The app is managed Expo (CNG — no committed `android/`), so this Kotlin is compiled
only by an **EAS dev-client build**. The web export + `vitest` suites never load it
(`requireOptionalNativeModule('GogosenseDetector')` returns `null` off-device, so the
platform selector falls back to the unsupported detector). The full JS layer is
verified by `vitest` + `tsc`; the native half is verified **on a real Android device**.

**Theming:** GoGoSense screens and `GoGoSenseDetectionBanner` use `useThemedStyles` /
`ThemeColors` like the rest of the customer app — see `docs/dark-mode.md`.

## Phase 4 — build + verify on a device (owner)

Prerequisites (owner-provided — not in the repo):
1. **`EXPO_TOKEN`** repo secret (expo.dev → Account → Access Tokens). Without it
   `eas build` cannot authenticate. (Confirmed not set as of this PR.)
2. **`EXPO_PUBLIC_EAS_PROJECT_ID`** wired for the build (see `app.config.ts` → `extra.eas`).
3. **≥1 GoGoSense merchant enabled** in staging Mongo with a real Involve
   `offer_id`/`network_merchant_id` — all 30 seeds ship **disabled**, so `/gogosense/detect`
   matches nothing until then.

Build the dev client (CI or local):

```bash
# CI: dispatch the existing workflow
gh workflow run deploy-app-native-eas.yml -f action=build -f platform=android -f profile=development

# local equivalent
cd apps/app && eas build --profile development --platform android
```

Install the resulting dev-client APK on an Android phone, then:

1. Open GoGoCash → GoGoSense → **Permissions** → tap **Grant usage access** → enable
   GoGoCash in the OS "Usage access" screen → return; status should read *granted*.
2. Open an **enabled** merchant app (e.g. Shopee), then return to GoGoCash → GoGoSense
   hub. Expect a **POST `/gogosense/detect`** (matched) and the **Activate cashback**
   nudge. Tap it → **POST `/gogosense/activate`** → the affiliate deeplink opens.
3. GoGoSense → **Timeline** shows the detection; **Settings** toggles persist
   (POST `/gogosense/settings`).

## Play Console (before any production submission)

`PACKAGE_USAGE_STATS` (the only restricted permission added) needs an in-app
disclosure + a privacy-policy entry describing the Usage-Access usage. No
`QUERY_ALL_PACKAGES`.
