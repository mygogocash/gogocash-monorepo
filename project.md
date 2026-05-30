# GoGoCash — Project Overview

## What this is
A monorepo migrating the GoGoCash customer app from **Next.js (web only)** to **Expo (web + iOS + Android from one codebase)**. The Expo app becomes the single source of truth; the Next.js app (`gogocash_app-staging`, a separate repo) is the frozen visual reference during migration.

## Repository layout
```
gogocash_app-feature-login-firebase/      # this repo (Expo migration target)
├── apps/
│   ├── mobile/        # Expo SDK 56 app (RN 0.85, React 19, expo-router, react-native-web)
│   │   ├── app/             # expo-router file-based routes
│   │   ├── src/
│   │   │   ├── screens/         # screen components
│   │   │   ├── components/      # shared UI (CustomerDesktopHeader/Footer, MobileBottomNav…)
│   │   │   ├── design/          # webDesignParity.ts — shared visual fixtures + layout helpers
│   │   │   ├── theme/           # tokens.ts, icons (phosphor adapter), motion
│   │   │   ├── lib/             # clipboard, etc.
│   │   │   └── __tests__/       # vitest source-string parity tests
│   │   └── app.json, eas.json, vitest.config.ts
│   └── web/           # legacy/secondary surface
├── docs/research/     # audit + research scratch (gitignored)
├── Dockerfile, railway.json   # deploy (Railway / Nixpacks / Node 22)
└── project.md · context.md · agent.md · design.md
```

## Current goal
Bring `apps/mobile` to **visual + structural parity** with the frozen Next.js reference, route by route, BEFORE wiring live data. Parked / out of scope for this pass: auth, API integration, i18n, analytics, web3, Stripe.

## Status (high level)
Route coverage complete; visual-parity pass in progress (multi-agent audit had ~50% false positives, so every gap is ground-truthed before fixing). 9 confirmed gaps fixed under strict RED→GREEN TDD. See **context.md** for exactly what's shipped vs remaining, **design.md** for the design system, **agent.md** for the development workflow + environment gotchas.

## Working commands
```
cd apps/mobile
npx tsc --noEmit                                 # types (0 errors required)
npx vitest run --config vitest.config.ts         # full parity suite
```
Branch: `expo-module`. Remote: `origin` → github.com/mygogocash/gogocash_app.git. Deploy = Railway. **Do not deploy without explicit sign-off.**
