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
   To upsert the default catalog and enable the first seed for a device pass:
   ```bash
   MONGO_URI="$STAGING_MONGO_URI" npm run gogosense:seed-merchants -w apps/api -- --enable-first
   ```
   If preflight reports `GET /gogosense/merchants returned 404`, the public API
   base URL is serving a deployment without the GoGoSense module. Redeploy the
   current API to staging before seeding or running final device acceptance.

Build the dev client (CI or local):

```bash
# CI: dispatch the existing workflow
gh workflow run deploy-app-native-eas.yml -f action=build -f platform=android -f profile=development

# local equivalent
cd apps/app && eas build --profile development --platform android
```

Install the resulting dev-client APK on an Android phone, then:

`npm run gogosense:dev-client -w apps/app` starts Metro with the required
localhost/IPv4 flags and configures `adb reverse tcp:8081 tcp:8081` for connected
Android devices before Expo starts.

1. Open GoGoCash → GoGoSense → **Permissions** → tap **Grant usage access** → enable
   GoGoCash in the OS "Usage access" screen → return; status should read *granted*.
2. Open an **enabled** merchant app (e.g. Shopee), spend up to two minutes there, then return to GoGoCash → GoGoSense
   hub. Expect a **POST `/gogosense/detect`** (matched) and the **Activate cashback**
   nudge. Tap it → **POST `/gogosense/activate`** → the affiliate deeplink opens.
3. GoGoSense → **Timeline** shows the detection; **Settings** toggles persist
   (POST `/gogosense/settings`).

### Installing the supported merchant APKs

For real-device acceptance, the preflight can now install the GoGoCash dev-client APK and the supported merchant split APKs in one pass:

```bash
node apps/app/scripts/gogosense-preflight.mjs \
  --install-apk /path/to/gogocash-development-android.apk \
  --merchant-apks /path/to/com.shopee.th.apk,/path/to/config.arm64_v8a.apk,/path/to/config.mdpi.apk \
  --merchant-packages com.shopee.th \
  --grant-usage-access \
  --require-foreground \
  --activate \
  --open-deeplink
```

`--merchant-apks` accepts a comma-separated base/split APK list and runs `adb install-multiple -r` on the selected device before checking `pm list packages`. `--grant-usage-access` runs `adb shell appops set <package> GET_USAGE_STATS allow` before the permission readback so the preflight verifies the granted state.

## Play Console (before any production submission)

`PACKAGE_USAGE_STATS` (the only restricted permission added) needs an in-app
disclosure + a privacy-policy entry describing the Usage-Access usage. No
`QUERY_ALL_PACKAGES`.

## Local pre-device checks

Run these before the EAS/dev-client device pass:

```bash
npm run test -w apps/app -- src/__tests__/mobile-launch-contract.test.ts src/__tests__/gogosense-api.test.ts src/__tests__/gogosense-detection-runner.test.ts src/__tests__/gogosense-session.test.ts --reporter=dot
npm run test:render -w apps/app -- src/__tests__/customer-gogosense.render.test.tsx src/__tests__/gogosense-hook.render.test.tsx src/__tests__/gogosense-permissions.render.test.tsx src/__tests__/gogosense-timeline.render.test.tsx --reporter=dot
npm run typecheck -w apps/app
```
