# Sentry on EAS native builds

`@sentry/react-native` is in dependencies. `EXPO_PUBLIC_SENTRY_DSN` is **inlined at native build time** from **EAS secrets / environment variables on expo.dev** — not from GitHub Actions runner env (remote `eas build` workers do not receive runner exports) and not from `$VAR` placeholders in `eas.json` (those are passed literally).

`initObservability()` only calls `Sentry.init` when `sentryDsn` is non-empty (`apps/app/src/observability/client.ts`). An empty/missing DSN is the correct default when observability is not configured.

## Required for native crash reporting

| Variable | Source |
|----------|--------|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry project → Client keys (DSN) |

Set in EAS before native store builds:

```bash
cd apps/app
eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value ... --type string
```

`eas.json` profiles do **not** embed the DSN.

For **OTA updates** (`eas update`), GitHub Actions inlines the DSN from the `staging` environment — see `.github/workflows/app-ota-staging.yml` and the `update` step in `deploy-app-native-eas.yml`.

## Source maps (EAS Build)

When the Sentry Expo plugin is enabled, configure `SENTRY_AUTH_TOKEN` via EAS secret (not a `$` placeholder in `eas.json`):

```bash
eas secret:create --name SENTRY_AUTH_TOKEN --value ... --type string
```

See Sentry docs for `sentry.properties` and EAS build hooks.

## Web

Expo web export can use the same DSN via `EXPO_PUBLIC_SENTRY_DSN` in Railway `app-web` build args.

## Related

- [posthog-native-verification.md](./posthog-native-verification.md)
- [store-release-checklist.md](./store-release-checklist.md)
