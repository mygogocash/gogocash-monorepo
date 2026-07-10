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

## Native phone OTP (@react-native-firebase/auth)

Since app version **0.2.0**, native builds sign in with phone OTP through
`@react-native-firebase/auth` (Play Integrity handles app verification — no
reCAPTCHA). Web keeps the Firebase JS SDK + invisible reCAPTCHA; both feed the
same `POST /auth/log-in` exchange.

**Owner setup (one-time, Firebase console → gogocash-staging):**

1. Add an **Android app** with package `co.gogocash.app` (Project settings →
   Your apps). Add the app's SHA-256 fingerprint (EAS: `eas credentials` →
   Android → keystore fingerprints) so Play Integrity verification works.
2. Download `google-services.json` and provide it to builds either as an EAS
   file secret — `eas secret:create --name GOOGLE_SERVICES_JSON --type file
   --value ./google-services.json` (the config reads the env path) — or commit
   it at `apps/app/google-services.json` (it contains no private keys).
3. iOS later: same flow with `GoogleService-Info.plist` /
   `GOOGLE_SERVICE_INFO_PLIST`.

Until the file is present, prebuild deliberately omits the
`@react-native-firebase/app` plugin (see `app.config.js`) and that binary
reports "Native phone sign-in is unavailable in this build." — nothing breaks.

**Test numbers:** Firebase console → Authentication → Sign-in method → Phone →
"Phone numbers for testing". `+66 999999999` / `654321` is registered; test
numbers skip real SMS and work on native once the Android app is registered.

**Runtime note:** 0.1.0 binaries (APK ≤ 39) lack the native module and stay on
the 0.1.0 OTA runtime — this JS never reaches them.
