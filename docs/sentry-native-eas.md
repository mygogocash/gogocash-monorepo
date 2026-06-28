# Sentry on EAS native builds

`@sentry/react-native` is in dependencies. Native crash reporting requires:

1. `EXPO_PUBLIC_SENTRY_DSN` in EAS build env (see `eas.json` profiles + EAS secrets).
2. Optional: `@sentry/react-native/expo` config plugin in `app.config.ts` after Sentry org/project are provisioned.

## Source maps (EAS Build)

When the Sentry Expo plugin is enabled, configure in `eas.json`:

```json
"production": {
  "env": {
    "SENTRY_AUTH_TOKEN": "set-via-eas-secret"
  }
}
```

See Sentry docs for `sentry.properties` and EAS build hooks.

## Web

Expo web export can use the same DSN via `EXPO_PUBLIC_SENTRY_DSN` in Railway `app-web` build args.

## Related

- [store-release-checklist.md](./store-release-checklist.md)
