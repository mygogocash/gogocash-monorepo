# OTA smoke test (manual)

Verify EAS Update end-to-end on a **development** or **preview** native build.

**Prerequisites**

- [ ] `EXPO_TOKEN` set (`expo.dev` → Account → Access Tokens)
- [ ] EAS project id in `EXPO_PUBLIC_EAS_PROJECT_ID` (see `apps/app/.env.example`)
- [ ] Android device or emulator for APK install

## Steps

1. **Build dev client**

   ```bash
   cd apps/app
   eas build --profile development --platform android
   ```

2. **Install APK** from EAS dashboard or CI artifact (`deploy-app-native-eas` workflow).

3. **Make a visible JS change** (e.g. temporary string on home screen in `CustomerHomeScreen.tsx`).

4. **Publish OTA**

   ```bash
   eas update --channel development --message "ota-smoke: visible string test"
   ```

   For preview builds use `--channel staging`.

5. **Relaunch app** (kill process, open again). Confirm the string change appears without reinstalling APK.

## Owner sign-off

- [ ] OTA applied on development channel
- [ ] OTA applied on staging channel (preview build)
- [ ] Rollback tested (see [ota-rollout.md](./ota-rollout.md))

## Known failure: updates explicitly disabled

If logcat shows:

```text
The expo-updates system is explicitly disabled. To enable it, set the enabled setting to true.
```

then the installed APK was built **without** `EXPO_PUBLIC_EAS_PROJECT_ID` at prebuild (`updates.url` omitted → `expo.modules.updates.ENABLED=false`). Staging OTA can publish successfully and still never apply.

**Fix:** rebuild with the `preview` / `development` profile in `eas.json` (both set `EXPO_PUBLIC_EAS_PROJECT_ID`). Confirm after install that logcat does **not** say “explicitly disabled”.

Seen on Seeker APK versionCode **38** (2026-07-09) — see [android-bug-hunt-2026-07-09.md](./android-bug-hunt-2026-07-09.md).
