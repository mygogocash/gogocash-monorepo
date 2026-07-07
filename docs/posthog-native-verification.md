# PostHog native verification

Native builds use `posthog-react-native` with keys from `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST`, inlined at **EAS build time** from **EAS secrets / environment variables on expo.dev** — not from `$VAR` placeholders in `eas.json`.

## EAS setup

```bash
cd apps/app
eas secret:create --name EXPO_PUBLIC_POSTHOG_KEY --value ... --type string
eas secret:create --name EXPO_PUBLIC_POSTHOG_HOST --value https://us.i.posthog.com --type string
```

`eas.json` profiles do **not** embed PostHog keys.

For **OTA updates**, GitHub Actions inlines PostHog from the `staging` environment — see `.github/workflows/app-ota-staging.yml`.

## Verification

1. Build with secrets set on expo.dev.
2. Launch app, trigger a tracked screen/event.
3. Confirm event in PostHog project dashboard.
