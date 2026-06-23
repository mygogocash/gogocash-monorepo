# GoGoSense Store Privacy Contract

This contract covers only the GoGoSense native detector and store privacy answers. The broader app-wide App Store privacy nutrition labels and Google Play Data safety form remain tracked by `REL-02` in `apps/app/docs/security-pentest-checklist.md`.

## Source Of Truth

- `apps/app/app.config.ts` wires `./plugins/withGogosenseUsageAccess`.
- `apps/app/plugins/withGogosenseUsageAccess.js` injects one Android restricted permission: `android.permission.PACKAGE_USAGE_STATS`.
- `apps/app/modules/gogosense-detector/expo-module.config.json` is Android-only: `"platforms": ["android"]`.
- The managed Expo app has no committed native `android/` or `ios/` app manifests.

## Requested Native Access

| Platform | GoGoSense native access | Store privacy answer |
| --- | --- | --- |
| Android | `android.permission.PACKAGE_USAGE_STATS` via Android Usage Access. | Declare Usage Access/restricted permission. Purpose: user-enabled foreground supported-merchant detection for cashback activation. |
| iOS | No GoGoSense native detector and no GoGoSense-specific native permission. | No GoGoSense-specific App Store privacy entry until an iOS detector is implemented. |

## Explicit Non-Goals

- No `android.permission.QUERY_ALL_PACKAGES`.
- No `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`.
- No `<service` notification-listener declaration.
- No `android.permission.ACCESS_FINE_LOCATION`.
- No `android.permission.CAMERA`.
- No `android.permission.RECORD_AUDIO`.
- No `android.permission.READ_CONTACTS`.
- No raw UsageEvents timeline upload.
- No broad installed-app inventory upload.
- No notification content, keyboard input, screenshots, or screen recording.

## Google Play Data Safety

Google defines collection as user data transmitted off the device. GoGoSense should therefore be declared from the data that the app actually transmits, not from local-only UsageStats reads.

For GoGoSense MVP:

- Declare the Android Usage Access/restricted permission because the manifest requests `android.permission.PACKAGE_USAGE_STATS`.
- If the detection endpoint receives a merchant package name, detect URL, or equivalent merchant-app identifier, include the relevant Google Play Data safety type for app inventory/app activity, such as `App activity > Installed apps`.
- Mark GoGoSense detection collection as optional/user-controlled because it requires the GoGoSense setting and Android Usage Access grant.
- Mark the purpose as app functionality for cashback activation.
- Do not mark this GoGoSense data as shared for advertising or analytics monetization.
- Do not declare broad app inventory collection unless the code starts uploading broad package inventory.

## App Store Privacy

GoGoSense currently has no iOS detector and no iOS native permission. Do not add a GoGoSense-specific App Store privacy answer until an iOS detector exists. If one is added later, review it against Apple's Usage Data categories and update this contract, tests, and in-app disclosure copy before release.

## Change Rule

Any GoGoSense native permission, native platform, detection payload, or disclosure-copy change must update:

- this contract,
- `apps/app/src/__tests__/gogosense-store-privacy-contract.test.ts`,
- `apps/app/docs/security-pentest-checklist.md`,
- the in-app GoGoSense Usage Access disclosure copy.

## References

- Google Play Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Android app data-use declaration guidance: https://developer.android.com/privacy-and-security/declare-data-use
- Apple App Store user privacy and data use: https://developer.apple.com/app-store/user-privacy-and-data-use/
