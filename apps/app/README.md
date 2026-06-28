# GoGoCash Mobile

Expo / react-native-web customer app (package `@gogocash/mobile`) — a desktop-and-mobile web-parity port of the Next.js customer app, the design + behavior source of truth. This is the `apps/app` workspace in the Turborepo monorepo; run commands with `npm --prefix apps/app run <script>` (or `npm run <script> -w @gogocash/mobile`).

## Local development

```bash
npm install                        # installs all workspaces from the repo root
npm --prefix apps/app run web      # Expo web — default UI parity surface (:8081)
npm --prefix apps/app run start:dev-client   # Metro for EAS dev client (native modules)
npm --prefix apps/app run gogosense:dev-client  # dev client + adb reverse for GoGoSense
```

| Goal | Command |
| --- | --- |
| UI / API parity (default) | `npm run web` |
| Native modules (GoGoSense) | `start:dev-client` + EAS **development** APK |
| Staging data, no local API | `EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co` in `.env` |
| Full cross-app E2E | `npm run e2e` at repo root — see [docs/E2E_QA_PLAN.md](../../docs/E2E_QA_PLAN.md) |

### Railway web vs EAS native

| Surface | Build | Host |
| --- | --- | --- |
| Customer **web** | `expo export --platform web` | Railway `@gogocash/mobile` (`app-web`) |
| Customer **iOS/Android** | `eas build` | EAS → stores / internal APK |
| JS OTA (native) | `eas update` | Expo channels — see [docs/ota-rollout.md](../../docs/ota-rollout.md) |

Full phased plan: [docs/mobile-expo-delegation-plan.md](../../docs/mobile-expo-delegation-plan.md).

**Monorepo local stack** (when exercising live API or admin alongside the customer app):

| Service | Path | Port |
| --- | --- | --- |
| API (NestJS) | `apps/api` | `:8080` |
| Admin (Next.js) | `apps/admin` | `:3000` |
| Customer app (Expo web) | `apps/app` | `:8081` |

npm workspaces hoist inconsistently — run `npm ci` at the repo root. If workspace dev commands fail module resolution, start from the app directory or set `NODE_PATH` (e.g. API: `NODE_PATH=./node_modules node dist/main` from `apps/api`).

## Appearance (light / dark)

Account Settings → **Appearance** offers **System**, **Light**, and **Dark**. Preference persists as `gogocash.theme.preference`. Implementation details: **[docs/dark-mode.md](docs/dark-mode.md)**.

## Verification — the three gates

```bash
npm --prefix apps/app run typecheck      # tsc --noEmit
npm --prefix apps/app run test           # node logic + source-grep contract/parity suite
npm --prefix apps/app run test:render    # happy-dom render suite (@testing-library/react)
npm --prefix apps/app run measure:bundle # optional web bundle size budget check
```

UI changes additionally require live verification on Expo web. Many tests are **contract tests** that pin endpoint strings, env defaults, the 15 session fields, and copy — if one fails after a rename, read the test before changing code (see `docs/api-integration.md` §6).

## Data source: fixtures vs live API

The app runs on web-parity fixtures by default. A built-in seam (`src/account/customerAccountResource.ts`) switches per-environment:

```bash
# apps/app/.env
EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=fixtures   # default; "backend" = live API, "disabled" = off
EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_FRONTEND_URL=https://app-staging.gogocash.co
```

`EXPO_PUBLIC_*` values are inlined at bundle time — **restart the dev server after editing `.env`**. Production forbids `fixtures` at runtime. The live catalog (public `GET /offer`) is already wired through this seam on the Favorite Brands screen; see **[docs/api-integration.md](docs/api-integration.md)** for the full integration state, the mapper pattern, live-probe results, and next steps.

## Auth

Login currently uses a demo-session stub. Real Firebase phone-auth plumbing exists in `src/auth/firebaseClient.ts` / `firebasePhoneAuth.ts` / `firebaseLogin.ts` (unit-tested, pending screen wiring) against the `gogocash-staging` project. Client config lives in `.env` under `EXPO_PUBLIC_FIREBASE_*` (untracked — fetch from Firebase console → Project settings → Your apps → "GoGoCash Mobile").

## GoGoSense — Android cashback detection

GoGoSense detects when the user opens a partner merchant app (e.g. Shopee) and nudges them to **activate cashback** before they shop. **Android only** (iOS/web get an unsupported no-op).

- **Native module:** [`modules/gogosense-detector`](modules/gogosense-detector/README.md) — a local Expo module (Kotlin) reading the foreground app via `UsageStatsManager`. Scope = UsageStats **foreground-only MVP**; deferred: always-on foreground service, NotificationListener, screenshot-OCR.
- **JS layer (`src/gogosense/`):** `nativeDetector` (adapter) → `selectDetector` (platform pick) → `detectorInstance` (live singleton) → `session` (permission flow + detect loop + `lastMatch` + `activate`) → `useGoGoSense` hook. Data hooks `useGoGoSenseApi` / `useGoGoSenseTimeline` / `useGoGoSenseSettings` / `useGoGoSenseMerchants` / `useGoGoSenseRecovery` are all **render-safe** (api resolves `null` off-device → static/empty fallback).
- **Manual recovery:** `/gogosense/recovery` creates a backend recovery job for customer-provided receipt evidence after automatic UsageStats tracking misses. It does **not** capture screenshots, run OCR, or enable NotificationListenerService.
- **Screen (`CustomerGoGoSenseScreen`):** the `permissions` route requests Usage Access (live status + grant button); `hub` runs `GoGoSenseDetectionBanner` (detection loop → activate nudge → deeplink); `timeline` lists detections; `settings` has real toggles.
- **Detector injection:** the screen takes a `detector` prop defaulting to the unsupported no-op — the **Android routes inject the live `gogosenseDetector`**, because importing it pulls `expo-modules-core` which crashes the happy-dom render harness. Never import `detectorInstance` from the screen.
- **Verify on a device:** the native half is built + verified only by an EAS dev-client build — see the [module README](modules/gogosense-detector/README.md) for the runbook (owner `EXPO_TOKEN` + ≥1 enabled merchant + Play Usage-Access disclosure).

## Store builds & EAS

```bash
npm --prefix apps/app run build:preview
npm --prefix apps/app run build:production
npm --prefix apps/app run start:dev-client   # Metro against dev-client install
```

**EAS Workflows** (manual): `apps/app/.eas/workflows/build-preview-android.yml` — trigger from Expo dashboard or `eas workflow:run`.

**OTA:** `eas update --channel staging` after `expo-updates` is configured — see [docs/ota-smoke.md](../../docs/ota-smoke.md).

Set Sentry, PostHog, Firebase, and EAS values through EAS secrets or local env files. Do not commit secrets.

## More docs

- [AGENTS.md](AGENTS.md) — working rules, conventions, react-native-web gotchas
- [docs/api-integration.md](docs/api-integration.md) — API & auth integration handoff
- [docs/dark-mode.md](docs/dark-mode.md) — customer app light/dark theme system
