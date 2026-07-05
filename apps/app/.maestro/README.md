# Maestro device flows for @gogocash/mobile

Install: https://maestro.mobile.dev/docs/getting-started/installation

## Prerequisites

- Android emulator or device
- **Dev client** APK (GoGoTrack) or Expo Go for limited UI-only flows
- App pointed at staging or local API (`EXPO_PUBLIC_API_URL`)

## Run

```bash
cd apps/app
npm run test:maestro
# or a single flow:
maestro test .maestro/flows/home.yaml

# Authenticated wallet (device + GOGOTRACK_AUTH_TOKEN or preflight evidence):
GOGOTRACK_AUTH_TOKEN=... npm run staging:maestro-wallet

# Bug hunt P0/P1 smoke (logged-out flows):
npm run bug-hunt:maestro
```

Set `appId` in flows matches `co.gogocash.app` (see `app.config.ts`).

## CI

Optional manual workflow: `.github/workflows/maestro-smoke.yml` — not a PR gate.

## Related

- [docs/mobile-expo-delegation-plan.md](../../docs/mobile-expo-delegation-plan.md) Phase 4
- Playwright web E2E: `apps/app/e2e/`
