# GoGoCash Mobile

Expo / react-native-web customer app — a desktop-and-mobile web-parity port of the Next.js app at the repo root (which remains the design + behavior source of truth). Separate npm project: run commands from `apps/mobile/`, or via the root `npm run mobile:*` proxies.

## Local development

```bash
npm --prefix apps/mobile install
npm run mobile:start            # native dev client
npm --prefix apps/mobile run web   # Expo web (the live-verify surface), port 19006
```

## Verification — the three gates

```bash
npm run typecheck      # tsc --noEmit
npm test               # node logic + source-grep contract/parity suite
npm run test:render    # happy-dom render suite (@testing-library/react)
```

UI changes additionally require live verification on Expo web. Many tests are **contract tests** that pin endpoint strings, env defaults, the 15 session fields, and copy — if one fails after a rename, read the test before changing code (see `docs/api-integration.md` §6).

## Data source: fixtures vs live API

The app runs on web-parity fixtures by default. A built-in seam (`src/account/customerAccountResource.ts`) switches per-environment:

```bash
# apps/mobile/.env
EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=fixtures   # default; "backend" = live API, "disabled" = off
EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_FRONTEND_URL=https://app-staging.gogocash.co
```

`EXPO_PUBLIC_*` values are inlined at bundle time — **restart the dev server after editing `.env`**. Production forbids `fixtures` at runtime. The live catalog (public `GET /offer`) is already wired through this seam on the Favorite Brands screen; see **[docs/api-integration.md](docs/api-integration.md)** for the full integration state, the mapper pattern, live-probe results, and next steps.

## Auth

Login currently uses a demo-session stub. Real Firebase phone-auth plumbing exists in `src/auth/firebaseClient.ts` / `firebasePhoneAuth.ts` / `firebaseLogin.ts` (unit-tested, pending screen wiring) against the `gogocash-staging` project. Client config lives in `.env` under `EXPO_PUBLIC_FIREBASE_*` (untracked — fetch from Firebase console → Project settings → Your apps → "GoGoCash Mobile").

## Store builds

```bash
npm --prefix apps/mobile run build:preview
npm --prefix apps/mobile run build:production
```

Set Sentry, PostHog, Firebase, and EAS values through EAS secrets or local env files. Do not commit secrets.

## More docs

- [AGENTS.md](AGENTS.md) — working rules, conventions, react-native-web gotchas
- [docs/api-integration.md](docs/api-integration.md) — API & auth integration handoff
- [../../HANDOFF.md](../../HANDOFF.md) — branch-level state across web + mobile
