# gototrack-detector (local Expo module)

Android-only native module that backs GoGoTrack's foreground-app detection via
`UsageStatsManager`. It implements the `GoGoTrackDetector` contract consumed by
`src/gototrack/*` (adapter → selector → session → hook → screen).

**Scope (MVP, locked):** UsageStats only — `start/stopDetection` are no-ops and the
JS layer drives the foreground-only loop. No NotificationListenerService, no
screenshot capture, no always-on foreground service (all deferred).

## Why it isn't built/verified by CI or the JS suite

The app is managed Expo (CNG — no committed `android/`), so this Kotlin is compiled
only by an **EAS dev-client build**. The web export + `vitest` suites never load it
(`requireOptionalNativeModule('GototrackDetector')` returns `null` off-device, so the
platform selector falls back to the unsupported detector). The full JS layer is
verified by `vitest` + `tsc`; the native half is verified **on a real Android device**.

**Theming:** GoGoTrack screens and `GoGoTrackDetectionBanner` use `useThemedStyles` /
`ThemeColors` like the rest of the customer app — see `docs/dark-mode.md`.

## Phase 4 — build + verify on a device (owner)

Prerequisites (owner-provided — not in the repo):
1. **`EXPO_TOKEN`** repo secret (expo.dev → Account → Access Tokens). Without it
   `eas build` cannot authenticate. (Confirmed not set as of this PR.)
2. **`EXPO_PUBLIC_EAS_PROJECT_ID`** wired for the build (see `app.config.ts` → `extra.eas`).
3. **≥1 GoGoTrack merchant enabled** in staging Mongo with a real Involve
   `offer_id`/`network_merchant_id` — all 30 seeds ship **disabled**, so `/gototrack/detect`
   matches nothing until then.
   To upsert the default catalog and enable the first seed for a device pass:
   ```bash
   MONGO_URI="$STAGING_MONGO_URI" npm run gototrack:seed-merchants -w apps/api -- --enable-first
   ```
   If preflight reports `GET /gototrack/merchants returned 404`, the public API
   base URL is serving a deployment without the GoGoTrack module. Redeploy the
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

`npm run gototrack:dev-client -w apps/app` starts Metro with the required
localhost/IPv4 flags and configures `adb reverse tcp:8081 tcp:8081` for connected
Android devices before Expo starts.

1. Open GoGoCash → GoGoTrack → **Permissions** → tap **Grant usage access** → enable
   GoGoCash in the OS "Usage access" screen → return; status should read *granted*.
2. Open an **enabled** merchant app (e.g. Shopee), spend up to two minutes there, then return to GoGoCash → GoGoTrack
   hub. Expect a **POST `/gototrack/detect`** (matched) and the **Activate cashback**
   nudge. Tap it → **POST `/gototrack/activate`** → the affiliate deeplink opens.
   Device automation can target the activation nudge with
   `testID="gototrack-activate-cashback-button"` or the accessibility label
   `Activate GoGoTrack cashback`.
3. GoGoTrack → **Timeline** shows the detection; **Settings** toggles persist
   (POST `/gototrack/settings`).

### Installing the supported merchant APKs

For real-device acceptance, the preflight can now install the GoGoCash dev-client APK and the supported merchant split APKs in one pass:

```bash
node apps/app/scripts/gototrack-preflight.mjs \
  --install-apk /path/to/gogocash-development-android.apk \
  --install-apk-sha256 5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a \
  --configure-metro-reverse \
  --merchant-apks /path/to/com.shopee.th.apk,/path/to/config.arm64_v8a.apk,/path/to/config.mdpi.apk \
  --merchant-packages com.shopee.th \
  --grant-usage-access \
  --open-merchant \
  --evidence-dir /path/to/gototrack-evidence \
  --capture-device-evidence \
  --checkpoint-delay-ms 1500 \
  --require-foreground \
  --return-to-gototrack \
  --require-nudge \
  --tap-nudge \
  --activate \
  --open-deeplink
```

`--install-apk-sha256` verifies the dev-client artifact before any `adb install` runs. `--configure-metro-reverse` runs `adb reverse tcp:8081 tcp:8081` (or `--metro-port <port>`) on the selected device so the installed dev-client can reach local Metro before GoGoTrack is opened. `--merchant-apks` accepts a comma-separated base/split APK list and runs `adb install-multiple -r` on the selected device before checking `pm list packages`. `--open-merchant` sends an Android launcher intent to the first installed/supported merchant package before the foreground check, so final QA records both package install and foreground evidence from the same command. `--return-to-gototrack` reopens `gogocash://gototrack` after the merchant foreground proof so the GoGoCash hub/nudge surface is the next device state before optional deeplink opening. `--require-nudge` requires that return step and fails the preflight unless `gototrack-hub-ui.xml` contains the activation nudge text/accessibility evidence before accepting deeplink proof. `--tap-nudge` then taps the activation nudge bounds from that UI hierarchy, writes `activation-nudge-tap.txt` with the source UI file and tap coordinates, and records the `activation-nudge-tap-*` checkpoint before deeplink proof. `--open-deeplink` opens the returned activation URL, captures `dumpsys window` after Android handles the affiliate URL, and records the `activation deeplink foreground` checklist result before the `activation-deeplink-*` checkpoint. `--grant-usage-access` runs `adb shell appops set <package> GET_USAGE_STATS allow` before the permission readback so the preflight verifies the granted state. `--evidence-dir` writes `acceptance-checklist.md`, `preflight-report.json`, `summary.txt`, `preflight-command.txt`, and `activation-deeplink.txt` for the PR/device acceptance record. `--capture-device-evidence` adds final external ADB evidence files (`device-adb-reverse.txt`, `device-window.txt`, `device-logcat.txt`, `device-screenshot.png`) plus checkpoint window, screenshot, and UI hierarchy files for `merchant-foreground`, `gototrack-hub`, `activation-nudge-tap`, and `activation-deeplink` when those stages run. `--checkpoint-delay-ms` gives Android time to settle after stage transitions before checkpoint screenshots are captured. These preflight flags do not change the GoGoTrack runtime module scope.

## Play Console (before any production submission)

`PACKAGE_USAGE_STATS` (the only restricted permission added) needs an in-app
disclosure + a privacy-policy entry describing the Usage-Access usage. No
`QUERY_ALL_PACKAGES`.

## Local pre-device checks

Run these before the EAS/dev-client device pass:

```bash
npm run test -w apps/app -- src/__tests__/mobile-launch-contract.test.ts src/__tests__/gototrack-api.test.ts src/__tests__/gototrack-detection-runner.test.ts src/__tests__/gototrack-session.test.ts --reporter=dot
npm run test:render -w apps/app -- src/__tests__/customer-gototrack.render.test.tsx src/__tests__/gototrack-hook.render.test.tsx src/__tests__/gototrack-permissions.render.test.tsx src/__tests__/gototrack-timeline.render.test.tsx --reporter=dot
npm run typecheck -w apps/app
```

## Native Build Artifact Helper

After the `deploy-app-native-eas.yml` workflow produces a development Android
build, resolve the APK and SHA inputs for device acceptance with:

```bash
npm run gototrack:artifact -w @gogocash/mobile -- --run-id <github-actions-run-id>
```

The helper downloads the `gogocash-development-android` GitHub Actions artifact
to `/tmp/gogocash-eas-artifacts-<run-id>`, finds the extracted APK, reads the
published `.sha256` file when present, and prints a `gototrack:preflight`
command with the install hash, Metro reverse, usage-access, nudge, tap,
deeplink, and device-evidence gates already included. The generated command
also includes `--require-auth`, so missing `GOGOSENSE_AUTH_TOKEN` fails the
API probes instead of being accepted as a warning. If `--evidence-dir` is not
supplied, the printed command writes device evidence to
`/tmp/gogocash-eas-artifacts-<run-id>/gototrack-acceptance-evidence`. It does
not replace the real-device acceptance run; it only prepares the installable
dev-client inputs. The same command is written as an executable
`gototrack-preflight-command.sh` under the artifact output directory so the
device acceptance run can be replayed exactly.

If the workflow mirrored the native build to GCS, use the same helper against
the bucket prefix instead of the GitHub artifact:

```bash
npm run gototrack:artifact -w @gogocash/mobile -- --gcs-prefix gs://<bucket>/<prefix>
```

The GCS form downloads `gogocash-development-android.apk` and the adjacent
`.sha256` sidecar with `gcloud storage cp`; if the sidecar is absent, the helper
computes the APK hash locally and still prints the preflight command.

For controlled merchant foreground acceptance, pass the merchant install and
package inputs through the helper so the printed preflight command keeps the
APK, merchant, device, and evidence settings together:

```bash
npm run gototrack:artifact -w @gogocash/mobile -- --run-id <github-actions-run-id> \
  --device <adb-serial> \
  --merchant-apks /tmp/com.shopee.th.apk,/tmp/config.arm64_v8a.apk \
  --merchant-packages com.shopee.th \
  --evidence-dir /tmp/gototrack-acceptance
```

## Delegation plan

EAS profile: **`development`** (dev client). Device QA tasks: [docs/mobile-expo-delegation-plan.md](../../../docs/mobile-expo-delegation-plan.md) Phase 5.
