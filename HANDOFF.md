# Handoff — `expo-module` branch (GoGoCash web + Expo mobile)

**Repo:** `https://github.com/mygogocash/gogocash_app`
**Branch:** `expo-module`
**Last updated:** 2026-06-10. (The previous `staging`-branch web handoff this file held is preserved in git history.)

This repo holds **two separate apps**: the Next.js customer web app at the root (`src/`) and the Expo react-native-web parity port at `apps/mobile/` (own `package.json`, own `node_modules`, no workspace sharing — coupling is `npm run mobile:*` proxy scripts plus cross-tree contract tests).

## Where things stand

### Expo app (`apps/mobile/`) — the active workstream

- **Desktop web-parity UI** is largely complete across the profile section: wallet (functional transaction tabs + filter dropdowns), favorites (brand-color cards with working ♥ toggles), missing orders (MUI-style outlined form, image picker, submit modal), membership (trust strip, FAQ accordion, 3-column perks), GoGoPass score page, quest history (leaderboard + dialogs), referral (premium pass, functional tabs). Landed in commits `30f2f23`, `0349e5e`, `e645186`.
- **First live API integration is shipped and verified**: the Favorite Brands screen renders the real production offer catalog when `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend`. The mapper pattern it establishes is the template for all remaining resources.
- **Firebase auth plumbing is built but not screen-wired**: phone-OTP + `/auth/log-in` exchange modules exist and are unit-tested; the login screen still uses a demo-session stub.
- **Read the full integration handoff:** [`apps/mobile/docs/api-integration.md`](apps/mobile/docs/api-integration.md) — architecture, live-probe results, Firebase setup, pinned tests, and the suggested order of work.
- **Working rules for this app:** [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md) (gates, i18n via `tc()`, parity-test conventions, react-native-web gotchas).

### Web app (root `src/`)

- Unchanged architecture: single axios client → `NEXT_PUBLIC_API_URL`, Firebase-token auth, mock-adapter MOCK MODE. Documented in depth in [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md).
- Without `NEXT_PUBLIC_API_URL` set the web app runs entirely on mocks (orange banner) — that is the normal local-dev mode.

## Environment facts a new developer must know (verified 2026-06-10)

1. **Production API (`https://api.gogocash.co`) is live** (NestJS). `GET /offer` + categories are public; everything else is auth-gated behind Firebase tokens (`POST /auth/log-in`: *"Firebase token is required"*). CORS is open.
2. **Staging is down** — `api-staging.gogocash.co` 503s at the Google Frontend on every path and `app-staging.gogocash.co` fails TLS. Needs an ops redeploy before any safe end-to-end auth/write testing.
3. **The web's phone-OTP and SIWE auth endpoints do not exist on the real backend** (`/auth/send-otp`, `/auth/verify-otp`, `/auth/siwe-nonce` → 404). They live only in the web's mock adapter. Firebase is the only real auth path.
4. **Firebase:** project `gogocash-staging`; phone is the only enabled sign-in provider; a "GoGoCash Mobile" web app is registered; client config goes in `apps/mobile/.env` (untracked) under `EXPO_PUBLIC_FIREBASE_*`.

## Verification gates

```bash
# Web (repo root)
npm run validate
SKIP_ENV_VALIDATION=1 NEXTAUTH_SECRET="ci-build-placeholder-secret-min-32-chars!!" npm run build

# Mobile (run in apps/mobile, or via root npm run mobile:*)
npm run typecheck && npm test && npm run test:render
```

Mobile "done" = all three gates green **and**, for UI work, live-verified on Expo web (`npm run web`, port 19006). Many mobile tests are source-grep **contract tests** that pin endpoint strings, env defaults, session fields, and even JSX prop order — when one fails after a rename, read the test before "fixing" the code.

## Parallel-work etiquette

Multiple agents/developers work this branch concurrently. Commit **only files you changed**; expect unrelated dirty files (currently: home/discovery/category/auth screens, `AccountPageShell`, `webDesignParity.ts`, and the root planning docs `agent.md`/`context.md`/`design.md`/`project.md`/`spec.md` belong to another in-flight effort). `webDesignParity.ts` in particular is shared parity data — prefer screen-local additions over editing it.

---

_Update this file when the handoff is absorbed or the branch state changes materially._
