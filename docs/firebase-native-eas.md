# Firebase on EAS native builds

`EXPO_PUBLIC_FIREBASE_*` values are **inlined at native build time** from **EAS secrets / environment variables on expo.dev** — not from GitHub Actions runner env (remote `eas build` workers do not receive runner exports) and not from `$VAR` placeholders in `eas.json` (those are passed literally).

## Required keys

| Variable | Source |
|----------|--------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase console → Project settings → Web app |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Same |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Same |

Set in EAS (required before native store builds):

```bash
cd apps/app
eas secret:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value ... --type string
# repeat for AUTH_DOMAIN, PROJECT_ID, APP_ID
```

`eas.json` profiles do **not** embed Firebase keys.

For **OTA updates** (`eas update`), GitHub Actions inlines Firebase from the `staging` environment — see `.github/workflows/app-ota-staging.yml` and the `update` step in `deploy-app-native-eas.yml`.

## Authorized domains

Phone OTP requires authorized domains for:

- `app.gogocash.co`
- `app-staging.gogocash.co`
- Local dev: `localhost` (Expo web)

Railway `app-web` host must be listed if testing Firebase on deployed web.

## Railway web parity

Railway `app-web` uses the same `EXPO_PUBLIC_FIREBASE_*` build args — see `docs/railway-env-matrix.md` and `Dockerfile.web.railway`.

## Related

- [store-release-checklist.md](./store-release-checklist.md)
- [apps/app/docs/api-integration.md](../apps/app/docs/api-integration.md)
