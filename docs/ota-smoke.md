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
