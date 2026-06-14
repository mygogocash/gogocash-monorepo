# GoGoCash Monorepo — Dependency Upgrade Plan

> Generated 2026-06-14 from `npm outdated --workspaces`. Monorepo = 3 apps: `admin` (Next.js), `api` (NestJS), `app` (Expo).
> **Do NOT blanket-upgrade to latest.** Most "outdated" entries are framework majors or Expo-SDK-managed packages — bumping them together breaks things. Upgrade one framework major per PR, per app, with the build/boot CI gates green between each.

## Ground rules (read first)

1. **`apps/app` is Expo-SDK-managed.** `react-native`, `@sentry/react-native`, `react-native-screens`, `react-native-safe-area-context`, `@testing-library/react-native`, `phosphor-react-native`, etc. are pinned by **Expo SDK 56** to mutually-compatible versions. Hand-bumping them **desyncs the SDK and breaks native builds**. Upgrade the **Expo SDK** as a unit, then `npx expo install --fix`. (See Tier 2.)
2. **`@types/node` → `^22`, not 25.** Match the Node 22 runtime; 25 types a newer Node than you run.
3. **Two intentional pins — do not "bump to latest" casually:**
   - `apps/api` `@typescript-eslint/* 7.18.0` — pinned 2026-06-14 to stop an eslint-8 rule-loading crash (`no-unused-expressions allowShortCircuit`). Unpinning requires the eslint 8→9 migration (Tier 1, item 1).
   - `apps/admin` `next 16.2.9` — pinned 2026-06-14; a lower resolve broke `next build` in CI.
4. **Execution discipline:** one framework major = one PR. Keep the required `api build + boot smoke` gate + the per-app build gates green between upgrades so any regression is isolated and attributable.

---

## Tier 0 — safe now (one small PR)

| Package | App(s) | Current → Target | Notes |
|---------|--------|------------------|-------|
| `@types/node` | admin, api, app | 20 → **^22** | align to Node 22 runtime |
| `@types/next-auth` | admin | **remove** | deprecated stub; next-auth ships its own types |
| `class-validator` | api | 0.14.4 → 0.15.1 | pre-1.0 minor, low risk |
| `googleapis` | api | 166 → 173 | frequent additive releases |
| `prettier-plugin-tailwindcss` | admin | 0.7.4 → 0.8.0 | formatter only |
| `@tanstack/react-query`, `posthog-react-native`, `react-native-screens` | app | patch/minor | **via `npx expo install`**, not npm — keep SDK-aligned |

**Gate:** `turbo run build` for admin/api green; app `expo export --platform web` green.

---

## Tier 1 — framework majors (each its OWN PR, in this order)

| # | Upgrade | App | Risk | Effort | Why this order |
|---|---------|-----|------|--------|----------------|
| 1 | **eslint 8→9 (flat config) + `@typescript-eslint` 7.18→8** | api | med | M | **First.** Removes today's pin; aligns api with admin's eslint 9 so they can share config. Migrate legacy `.eslintrc` → `eslint.config.mjs`. |
| 2 | **TypeScript 5.9→6** | admin + api | med | M | `app` is already on TS 6 — this removes the split. New stricter checks; expect some `tsc` fixes. |
| 3 | **NestJS 10→11** (`@nestjs/common`,`core`,`schematics`,`testing`) | api | med-high | M-L | Express 5 + RxJS + lifecycle changes. The boot-smoke gate catches DI/bootstrap breaks. |
| 4 | **mongoose 8→9 + mongodb 6→7** | api | **HIGH** | L | Data layer — query/schema breaking changes. Do alone, AFTER repairing the api test suite so you have a safety net. |
| 5 | **firebase-admin 13→14** (api) + **firebase 11→12** (admin) | api, admin | med | M | Auth SDK majors — test login/token flows end-to-end. |
| 6 | **jest 29→30** (+ `@types/jest` 30, `@types/supertest` 7) | api | low-med | M | Pair with cleaning the 13 red `nest g` scaffold suites. |
| 7 | **MUI 7→9** (`@mui/material`,`@mui/system`,`@mui/x-data-grid` 8→9) | admin | med-high | **L** | Two majors; broad component-API churn. Biggest admin effort — visual-regress the dashboards. |
| 8 | Chart/UI libs: `recharts 2→3`, `apexcharts 4→5` (+`react-apexcharts 1→2`), `swiper 11→12`, `react-dropzone 14→15`, `tailwind-merge 2→3` | admin | med | M | Visual regressions — small batches with admin running. |
| 9 | `vitest 3→4` (+ `@vitejs/plugin-react 4→6`, `happy-dom 15→20`) | admin (+ app vitest) | low-med | M | Test tooling; app already permits vitest 4. |
| 10 | `customerio-node 4→5`, `jwks-rsa 3→4`, `eslint-config-prettier 9→10` | api | low | S | Small majors — fold into adjacent PRs. |

---

## Tier 2 — Expo SDK (the app, as one unit)

Upgrade the **Expo SDK** (56 → latest), then:
```bash
cd apps/app
npx expo install expo@latest
npx expo install --fix      # realigns react-native (→0.86), @sentry/react-native (→8),
                            # @testing-library/react-native (→14), phosphor-react-native (→3), etc.
npx expo-doctor            # verify SDK compatibility
```
Then re-run the web export + an EAS preview build. **Never** bump these RN/expo-* packages individually.

---

## Reference — full outdated list (2026-06-14)

**api** (`gogocash-api`): @nestjs/* 10.4→11.1, @nestjs/schematics 10.2→11.1, mongoose 8.24→9.7, mongodb 6.21→7.3, typescript 5.9→6.0, eslint 8.57→10.5, @typescript-eslint 7.18→8.61 (pinned), eslint-config-prettier 9.1→10.1, jest 29.7→30.4, @types/jest 29→30, @types/supertest 6→7, firebase-admin 13.10→14.0, googleapis 166→173, customerio-node 4.5→5.0, jwks-rsa 3.2→4.0, class-validator 0.14→0.15, @types/node 20→25(→22).

**admin** (`gogocash-admin`): @mui/material+system 7.3→9.1, @mui/x-data-grid 8.29→9.5, eslint 9.39→10.5, firebase 11.10→12.14, firebase-tools 13.35→15.20, recharts 2.15→3.8, apexcharts 4.7→5.15, react-apexcharts 1.9→2.1, swiper 11.2→12.2, react-dropzone 14.4→15.0, tailwind-merge 2.6→3.6, vitest 3.2→4.1, @vitejs/plugin-react 4.7→6.0, happy-dom 15→20, typescript 5.9→6.0, prettier-plugin-tailwindcss 0.7→0.8, @types/node 20→25(→22), @types/next-auth (remove), next 16.2.9 (pinned).

**app** (`@gogocash/mobile`, Expo 56 — upgrade via SDK, not individually): react-native 0.85→0.86, @sentry/react-native 7.11→8.14, @tanstack/react-query 5.100→5.101, @testing-library/react-native 13→14, phosphor-react-native 2.3→3.0, posthog-react-native 4.45→4.47, react-native-safe-area-context 5.7→5.8, react-native-screens 4.25.1→4.25.2, vitest 3.2→4.1, typescript ~6.0 (already current).

---

## Suggested sequencing
Tier 0 (1 PR) → Tier 1 #1 (eslint/ts-eslint — pays down today's pin) → #2 (TS 6, aligns all) → then the api data/framework majors (#3, #4) and admin UI majors (#7, #8) in parallel tracks → Tier 2 (Expo SDK) on its own cadence. Keep CI gates green between each.
