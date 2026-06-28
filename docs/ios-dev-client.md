# iOS dev client (internal distribution)

Build and distribute a **development client** for native features (GoGoSense module, custom config plugins).

## Build

```bash
cd apps/app
eas build --profile development --platform ios
```

Profile settings: `developmentClient: true`, `distribution: internal`, channel `development`.

## Install

- Download from EAS build page or TestFlight internal testing (after linking Apple credentials on EAS).
- See Expo skill `expo-dev-client` for TestFlight dev-build workflow.

## Metro

```bash
npm --prefix apps/app run start:dev-client
```

Point device at your machine IP if not using USB tunneling.

## Firebase authorized domains

Add to Firebase console → Authentication → Settings → Authorized domains:

- `app.gogocash.co`
- `app-staging.gogocash.co`
- Railway preview host if used (`*.up.railway.app` is not valid — use exact hostname)

## Associated domains (deep links)

Configured in `apps/app/app.config.ts`:

- `applinks:app.gogocash.co`
- `applinks:app-staging.gogocash.co`

Verify Apple Developer → Identifiers → Associated Domains matches entitlements after EAS build.

## Related

- [mobile-expo-delegation-plan.md](./mobile-expo-delegation-plan.md) Phase 3
- [modules/gogosense-detector/README.md](../apps/app/modules/gogosense-detector/README.md)
