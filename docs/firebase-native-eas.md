# Firebase on EAS native builds

`EXPO_PUBLIC_FIREBASE_*` values are **inlined at native build time** via `eas.json` profile `env` blocks and EAS secrets.

## Required keys

| Variable | Source |
|----------|--------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase console → Project settings → Web app |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Same |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Same |

Set in EAS:

```bash
cd apps/app
eas secret:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value ... --type string
# repeat for each key, or use eas.json env with EAS environment variables in dashboard
```

Profiles `preview` and `production` include empty Firebase keys in `eas.json` — **replace via EAS env/secrets before store builds**.

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
