# Store release checklist

Pre-flight for App Store and Google Play submission via EAS.

## Build & submit commands

```bash
cd apps/app
eas build --profile production --platform all
eas submit --profile production --platform all
```

Configure store credentials on EAS (`eas credentials`) before submit. See `eas.json` `submit.production` — replace placeholder `ascAppId` after App Store Connect setup.

## Privacy & disclosures

### GoGoTrack (Android)

- Permission: `PACKAGE_USAGE_STATS` (Usage Access)
- Disclose in Play Data safety form: app usage data for cashback activation
- In-app: Play Store Usage Access disclosure + in-app permission flow

### Firebase phone auth

- Identity / phone number collection
- See Firebase console auth settings

### Analytics & crash reporting

- PostHog (`EXPO_PUBLIC_POSTHOG_KEY`) — product analytics
- Sentry (`EXPO_PUBLIC_SENTRY_DSN`) — crash reporting when enabled

Deep checklist: [apps/app/docs/security-pentest-checklist.md](../apps/app/docs/security-pentest-checklist.md)

## OTA policy

- JS-only fixes: `eas update --channel production` after native `runtimeVersion` matches
- Native or plugin changes: new `eas build` + store release

See [ota-rollout.md](./ota-rollout.md).

## Native build smoke log

Record successful preview builds here (owner runs with `EXPO_TOKEN`):

| Date | Profile | Platform | EAS build ID | API URL verified |
|------|---------|----------|--------------|------------------|
| _pending_ | preview | android | | `https://api-staging.gogocash.co` |

## Related

- [firebase-native-eas.md](./firebase-native-eas.md)
- [ios-dev-client.md](./ios-dev-client.md)
- [mobile-expo-delegation-plan.md](./mobile-expo-delegation-plan.md) Phase 7
