# GoGoCash — Project Overview

## What this is
A monorepo migrating the GoGoCash customer app from **Next.js (web only)** to **Expo (web + iOS + Android from one codebase)**. The Expo app becomes the single source of truth; the Next.js app (`gogocash_app-staging`, a separate repo) is the frozen visual reference during migration.

## Repository layout
```
gogocash_app-feature-login-firebase/      # this repo (Expo migration target)
├── apps/
│   └── mobile/        # Expo SDK 56 app (RN 0.85, React 19, expo-router, react-native-web)
│       ├── app/             # expo-router file-based routes (~48 route files)
│       ├── src/             # 23 dirs — see full map below (re-derive with `ls apps/mobile/src`)
│       └── app.json, eas.json, vitest.config.ts, vitest.render.config.ts
├── docs/research/     # audit + research scratch (gitignored)
└── project.md · context.md · agent.md · design.md
```
> There is NO `apps/web/` (only `apps/mobile`). Root deploy artifacts `railway.json` + `Dockerfile.legacy-firebase` are **untracked** in git with no committed decision — Firebase hosting retired, Railway removed (see memory `gogocash-admin-railway-deploy`). Treat as limbo, not active config.

### apps/mobile/src — all 23 dirs (file counts drift; re-derive before trusting)
```
screens/        31  Customer*Screen.tsx, one per route surface
__tests__/      40  vitest source-string parity + render suites
components/      12  shared UI (AccountPageShell, MotionPressable, desktop/nav chrome)
theme/            5  tokens.ts, icons (phosphor adapter), motion, fonts, categoryIcons
analytics/        4  events.ts vocab, pageTracking, RouteAnalyticsTracker, useAnalytics (PostHog/Sentry WIRED)
auth/             4  session store + route guard + callback (WIRED at runtime; login FORM uses a hardcoded OTP)
test-support/     4  render-suite stubs (phosphor, expo-router, assets, footer slot)
gogosense/        3  detector.ts is a permanent NO-OP stub (Android native module unimplemented) under a full 8-route surface
account/          3  customerAccountResource (useQuery to real endpoints; DORMANT — defaults to fixtures)
navigation/       3  routes.ts (requiresAuth table), routeParams, conversion matrix
config/           2  env.ts + mobileAppConfig.ts (appEnv / accountDataSource flags)
design/           2  webDesignParity.ts source-of-truth fixtures (~2979 lines)
features/         2  golink + accountSetup helpers
lib/              2  clipboard + utils
types/            2  asset / phosphor type decls
api/              1  createMobileApiClient (live-data foundation, dormant by default)
billing/          1  api.ts (NO Stripe — payment parked)
observability/    1  client.ts (Sentry.init + PII redaction, WIRED)
pdpa/             1  api.ts (data-export client)
providers/        1  AppProviders.tsx (mounts QueryClient / PostHog / guards / RouteAnalyticsTracker)
security/         1  PrivacyScreenGuard.tsx (RN AppState overlay; expo-screen-capture NOT installed)
withdraw/         1  api.ts (createWithdrawApi — imported by NO screen, dormant)
legal/            1  privacyPolicyMarkdown.ts
```
> Status nuance (deep-verified 2026-05-31): several dirs are real-but-dormant or stubbed, NOT absent. See `context.md` "BACKLOG TRUTH" + memory `gogocash-expo-backlog-deepverify` before assuming "parked = nonexistent".

## Current goal
Bring `apps/mobile` to **visual + structural parity** with the frozen Next.js reference, route by route. Genuinely parked (verified absent — no deps): i18n runtime, web3, Stripe. NOT fully parked (deep-verified — foundations shipped, see context.md "BACKLOG TRUTH"): auth (session/guard/callback wired; login form stubbed), live-data (account resource wired but dormant), analytics (PostHog/Sentry wired; page_view + select_promotion events live as of the analytics slices).

## Status (high level)
Route coverage complete; visual-parity pass largely done (multi-agent audit had ~50% false positives, so every gap is ground-truthed before fixing). Shipped under strict RED→GREEN TDD: the original visual-parity fixes, Quest History view, the 7 security todos, a render-test harness, and analytics slices 1–3 (vocabulary + page_view + banner select_promotion). A 2026-05-31 deep-verify corrected the backlog framing (several "parked" items were actually shipped-but-dormant) and surfaced hidden pending (GoGoSense no-op detector, fabricated credit-score, dead NativeParityScreen). See **context.md** for the authoritative shipped-vs-remaining list (with the deep-verify truth), **design.md** for the design system, **agent.md** for workflow + environment gotchas. Re-run the commands in agent.md for live counts; do not trust pinned numbers/SHAs here.

## Working commands
```
cd apps/mobile
npx tsc --noEmit                                 # types (0 errors required)
npx vitest run --config vitest.config.ts         # full parity suite
```
Branch: `expo-module`. Remote: `origin` → github.com/mygogocash/gogocash_app.git. **Do not deploy without explicit sign-off.** (Deploy infra is unsettled — see the untracked `railway.json`/`Dockerfile.legacy-firebase` note above.)
