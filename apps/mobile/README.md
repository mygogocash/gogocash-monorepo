# GoGoCash Mobile

Expo/React Native customer app scaffold for iOS and Android.

## Local development

```bash
npm --prefix apps/mobile install
npm run mobile:start
```

The app uses the staging API by default:

```bash
EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_FRONTEND_URL=https://app-staging.gogocash.co
```

## Verification

```bash
npm run mobile:test
npm run mobile:typecheck
```

## Store builds

```bash
npm --prefix apps/mobile run build:preview
npm --prefix apps/mobile run build:production
```

Set Sentry, PostHog, Firebase, and EAS values through EAS secrets or local env files. Do not commit secrets.
