# GoGoTrack — Play Console internal testing checklist

Prep for Android **internal testing** track (T-011 / T-017). Owner applies answers in Play Console; agent does not submit.

## 1. Foreground service (FGS) special-use declaration

Source: `apps/app/modules/gototrack-detector/android/src/main/AndroidManifest.xml`

```xml
<service
  android:name="co.gogocash.gototrack.GototrackMonitorService"
  android:exported="false"
  android:foregroundServiceType="specialUse">
  <property
    android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
    android:value="GoGoTrack merchant cashback detection while the customer shops in supported apps." />
</service>
```

**Play Console → App content → Foreground service types**

- Type: **Special use**
- Subtype / justification (paste): `GoGoTrack merchant cashback detection while the customer shops in supported apps.`
- User-facing disclosure: optional background monitor notification ("GoGoTrack is watching for cashback") while Usage Access is granted and the user enables background prompts.

Permissions also declared via `apps/app/plugins/withGototrackUsageAccess.js`:

- `android.permission.PACKAGE_USAGE_STATS` (Usage Access — separate system settings grant)
- `android.permission.FOREGROUND_SERVICE`
- `android.permission.FOREGROUND_SERVICE_SPECIAL_USE`
- `android.permission.POST_NOTIFICATIONS`

## 2. Data safety form (GoGoTrack scope)

Source: `apps/app/docs/gototrack-store-privacy-contract.md`

| Question | Answer |
|----------|--------|
| Usage Access / restricted permission declared? | **Yes** — `PACKAGE_USAGE_STATS` |
| Data collected off-device? | **Optional** — only when user enables GoGoTrack + grants Usage Access |
| Data type | **App activity → Installed apps** (merchant package name / detect payload sent to `POST /gototrack/detect`) |
| Purpose | **App functionality** — cashback activation for supported merchants |
| Shared for ads/analytics? | **No** |
| Broad installed-app inventory? | **No** — no `QUERY_ALL_PACKAGES`; no raw UsageEvents upload |
| Not collected | Location, camera, mic, contacts, notification content, keyboard, screenshots |

**Explicit non-goals (do not declare):** `QUERY_ALL_PACKAGES`, notification listener, fine location, camera, audio, contacts.

## 3. Internal testing track prerequisites

- [ ] Google Play Developer account + app `co.gogocash.app` created
- [ ] EAS **preview** Android build finished (T-015) — same artifact for Play submit
- [ ] EAS submit credentials (Google Play service account) configured on expo.dev
- [ ] FGS special-use + Data safety sections above completed (or saved as draft)
- [ ] **Internal testing** track created in Play Console
- [ ] Tester emails documented (owner) — minimum 1 for T-021
- [ ] Opt-in / internal testing link ready to share after T-017 submit
- [ ] Staging API live at `https://api-staging.gogocash.co` (blocked until T-002/T-005 green)
- [ ] Preview build env: `EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co`, `EXPO_PUBLIC_FRONTEND_URL=https://app-staging.gogocash.co` (`apps/app/eas.json` preview profile)

## References

- [gototrack-store-privacy-contract.md](../apps/app/docs/gototrack-store-privacy-contract.md)
- [gototrack-android-acceptance-plan.md](./gototrack-android-acceptance-plan.md)
- [store-release-checklist.md](./store-release-checklist.md)
