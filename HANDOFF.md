# Handoff — `staging` branch (GoGoCash web)

**Repo:** `https://github.com/mygogocash/gogocash_app`  
**Branch:** `staging` (pushed with this commit)  
**Stack:** Next.js 16 (Turbopack dev), React, MUI, TanStack Query, NextAuth, Firebase, Crossmint.

## What landed in this update

- **Performance / shell:** Web Vitals reporter (`WebVitalsReporter` → `ProviderDefault`); `@next/bundle-analyzer` + `analyze` / `perf:bundle-note` scripts; `optimizePackageImports` for MUI in `next.config.ts`; TanStack Query defaults in `src/lib/query/queryClient.ts`; Crossmint readiness tweaks (`SettingCrossmint.tsx`); header/main/footer without global Crossmint “ready” gate (`ClientLayoutWrapper`, `ClientLayoutWallet`); lazy MUI Data Grid (`src/components/perf/LazyMuiDataGrid.tsx`) used from `WalletTransaction`, `MyOffer`; shop detail code-split in `shop/[id]/PageClient.tsx`; font fallback tuning in `src/lib/fonts.ts`.
- **Profile / layout:** Profile shell, sub-nav, personal panel, cashback summary, withdraw UI pieces, Figma-aligned footer/header/subprofile work; removed obsolete pieces (e.g. `SubProfileInfo.tsx`, `CategoryPopup.tsx` per git).
- **Link My Cashback:** New locale routes under `src/app/[locale]/link-mycashback/` plus auth/components and public assets under `public/images/link-mycashback-*`, `public/profile/link-mycashback-*`.
- **Console / CSP:** Dynamic `PageLoader` in `NavigationLoadingOverlay.tsx` and `DelayedPageLoadingScreen.tsx` to avoid unused CSS preload warnings; Web Vitals **dev** logging only when `NEXT_PUBLIC_WEB_VITALS_DEBUG=1`; CSP report-only adds `https://telegram.org` for Telegram widget (`next.config.ts`).

## CI / install

- **GitHub Actions** (`.github/workflows/ci.yml`) uses **`npm ci`** — keep **`package-lock.json`** in sync; do **not** rely on `pnpm-lock.yaml` for CI (left untracked intentionally if present locally).

## Environment reminders

- **`NEXTAUTH_SECRET`:** Required for `next start` and session API; without it, browser shows `[next-auth] CLIENT_FETCH_ERROR` and `/api/auth/session` 500.
- **`SKIP_ENV_VALIDATION=1`:** Used in CI build/E2E; local dev may use full `.env.local`.
- **Analytics:** `NEXT_PUBLIC_ANALYTICS_DEBUG` gates extra `console.info` in `metaPixel` / analytics helpers.
- **Web Vitals logs:** Optional `NEXT_PUBLIC_WEB_VITALS_DEBUG=true` in dev only.

## Known follow-ups (optional)

- DevTools may still show: Turbopack **HMR WebSocket** errors under Playwright/automation; **preload warnings** for Swiper CSS / gtag on home if scripts load after load event.
- Sentry build may warn if `SENTRY_AUTH_TOKEN` missing (source maps); non-blocking for runtime.

## Verification (run before merging to `main`)

```bash
npm ci
npm run validate
SKIP_ENV_VALIDATION=1 NEXTAUTH_SECRET="ci-build-placeholder-secret-min-32-chars!!" npm run build
```

E2E: see `playwright.config.ts` (`npm run test:e2e` with server per config).

## Key paths

| Area                 | Paths                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Layout / Crossmint   | `ClientLayoutWrapper.tsx`, `SettingCrossmint.tsx`, `ProviderDefault.tsx`                     |
| Perf                 | `WebVitalsReporter.tsx`, `LazyMuiDataGrid.tsx`, `queryClient.ts`, `next.config.ts`           |
| Profile UI           | `ProfileDesktopPersonalPanel.tsx`, `ProfileLayoutShell.tsx`, `SubProfile.tsx`, `SubPage.tsx` |
| Auth / link cashback | `src/app/[locale]/link-mycashback/`, `src/features/auth/component/link-mycashback/`          |

---

_Generated for continuity with the next developer or AI agent. Update or remove this file when the handoff is absorbed._
