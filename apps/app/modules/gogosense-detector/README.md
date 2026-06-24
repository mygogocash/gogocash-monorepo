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

If the local `/tmp` APK cache is gone, recover the successful GitHub Actions
artifact before the device pass:

```bash
gh run download <run-id> --dir /tmp/gogocash-eas-artifacts-<run-id>
shasum -a 256 /tmp/gogocash-eas-artifacts-<run-id>/gogocash-development-android/gogocash-development-android.apk
```

For the current accepted Android dev-client artifact, run `28014696785` produced
SHA-256 `5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a`.

Install the resulting dev-client APK on an Android phone, then:

`npm run gogosense:dev-client -w apps/app` starts Metro with the required
localhost/IPv4 flags and configures `adb reverse tcp:8081 tcp:8081` for connected
Android devices before Expo starts.

1. Open GoGoCash → GoGoSense → **Permissions** → tap **Grant usage access** → enable
   GoGoCash in the OS "Usage access" screen → return; status should read *granted*.
2. Open an **enabled** merchant app (e.g. Shopee), spend up to two minutes there, then return to GoGoCash → GoGoSense
   hub. Expect a **POST `/gogosense/detect`** (matched) and the **Activate cashback**
   nudge. Tap it → **POST `/gogosense/activate`** → the affiliate deeplink opens.
   Device automation can target the activation nudge with
   `testID="gogosense-activate-cashback-button"` or the accessibility label
   `Activate GoGoSense cashback`.
3. GoGoSense → **Timeline** shows the detection; **Settings** toggles persist
   (POST `/gogosense/settings`).

### Installing the supported merchant APKs

For real-device acceptance, the preflight can now install the GoGoCash dev-client APK and the supported merchant split APKs in one pass:

```bash
node apps/app/scripts/gogosense-preflight.mjs \
  --install-apk /path/to/gogocash-development-android.apk \
  --install-apk-sha256 5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a \
  --configure-metro-reverse \
  --merchant-apks /path/to/com.shopee.th.apk,/path/to/config.arm64_v8a.apk,/path/to/config.mdpi.apk \
  --merchant-packages com.shopee.th \
  --grant-usage-access \
  --open-merchant \
  --evidence-dir /path/to/gogosense-evidence \
  --capture-device-evidence \
  --checkpoint-delay-ms 1500 \
  --require-foreground \
  --return-to-gogosense \
  --require-nudge \
  --tap-nudge \
  --activate \
  --open-deeplink
```

`--install-apk-sha256` verifies the dev-client artifact before any `adb install` runs. `--configure-metro-reverse` runs `adb reverse tcp:8081 tcp:8081` (or `--metro-port <port>`) on the selected device so the installed dev-client can reach local Metro before GoGoSense is opened. `--merchant-apks` accepts a comma-separated base/split APK list and runs `adb install-multiple -r` on the selected device before checking `pm list packages`. `--open-merchant` sends an Android launcher intent to the first installed/supported merchant package before the foreground check, so final QA records both package install and foreground evidence from the same command. `--return-to-gogosense` reopens `gogocash://gogosense` after the merchant foreground proof so the GoGoCash hub/nudge surface is the next device state before optional deeplink opening. `--require-nudge` requires that return step and fails the preflight unless `gogosense-hub-ui.xml` contains the activation nudge text/accessibility evidence before accepting deeplink proof. `--tap-nudge` then taps the activation nudge bounds from that UI hierarchy, writes `activation-nudge-tap.txt` with the source UI file and tap coordinates, and records the `activation-nudge-tap-*` checkpoint before deeplink proof. `--open-deeplink` opens the returned activation URL, captures `dumpsys window` after Android handles the affiliate URL, and records the `activation deeplink foreground` checklist result before the `activation-deeplink-*` checkpoint. `--grant-usage-access` runs `adb shell appops set <package> GET_USAGE_STATS allow` before the permission readback so the preflight verifies the granted state. `--evidence-dir` writes `acceptance-checklist.md`, `preflight-report.json`, `summary.txt`, and `activation-deeplink.txt` for the PR/device acceptance record. `--capture-device-evidence` adds final external ADB evidence files (`device-adb-reverse.txt`, `device-window.txt`, `device-logcat.txt`, `device-screenshot.png`) plus checkpoint window, screenshot, and UI hierarchy files for `merchant-foreground`, `gogosense-hub`, `activation-nudge-tap`, and `activation-deeplink` when those stages run. `--checkpoint-delay-ms` gives Android time to settle after stage transitions before checkpoint screenshots are captured. These preflight flags do not change the GoGoSense runtime module scope.

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

## Native Build Artifact Helper

After the `deploy-app-native-eas.yml` workflow produces a development Android
build, resolve the APK and SHA inputs for device acceptance with:

```bash
npm run gogosense:artifact -w @gogocash/mobile -- --run-id <github-actions-run-id>
```

The helper downloads the `gogocash-development-android` GitHub Actions artifact
to `/tmp/gogocash-eas-artifacts-<run-id>`, finds the extracted APK, reads the
published `.sha256` file when present, and prints a `gogosense:preflight`
command with the install hash, Metro reverse, usage-access, nudge, tap,
deeplink, and device-evidence gates already included. It does not replace the
real-device acceptance run; it only prepares the installable dev-client inputs.
