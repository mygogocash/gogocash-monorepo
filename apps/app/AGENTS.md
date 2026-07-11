# AGENTS.md — GoGoCash Mobile (@gogocash/mobile)

Concise guidance for AI coding agents and contributors working in `apps/app/`. **Dev/build basics live in [README.md](./README.md); deeper plans in `FRONTEND_PARITY_PLAN.md` and `MIGRATION_PLAN.md`.**

> This is the `apps/app` workspace (package `@gogocash/mobile`) in the Turborepo monorepo. Run commands with `npm --prefix apps/app run <script>` (or `npm run <script> -w @gogocash/mobile`). The Next.js customer app is the **design + behavior source of truth** — this app is a react-native-web parity port of it.

## Project

- **Stack:** Expo SDK 57 + React Native 0.86.0 + **react-native-web 0.21.2**, React 19.2.7, TypeScript (strict). No `react-native-reanimated` — use the `Animated` API + `src/theme/motion.ts` + `src/theme/animatedMotion.ts`. **120 Hz motion:** animate `transform` and `opacity` only; avoid CSS transitions on `box-shadow`, `background-color`, or layout properties (`MotionPressable`, `motion.cssTransition`).
- **Routing:** **expo-router** ~57.0.2 (file-based, `app/`). Auth gating via `Stack.Protected` in `app/_layout.tsx`, driven by `useAuthGuardSession` (synchronous-on-first-render so the guard is correct on first paint).
- **i18n:** `tc()` from `src/i18n/useCopy.ts` — a **text-based reverse-lookup** into the reused web ICU catalogs, falling back to the English in `src/design/webDesignParity.ts`. Render copy inline as `tc("English string")`; do not invent new keys.
- **Design tokens:** `src/theme/colorPalettes.ts` (`lightColors` / `darkColors`) via `ThemeProvider` + `useTheme()` / `useThemeColors()` / `useThemedStyles()`; `src/theme/tokens.ts` holds `radii`, `spacing`, `typography` and a **legacy** static `colors` (= `lightColors`); icons `src/theme/icons.tsx` (phosphor adapters), motion `src/theme/motion.ts`. See [docs/dark-mode.md](./docs/dark-mode.md).
- **Data:** `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE` (`backend` default in `.env.example` + EAS `development`/`preview`; `fixtures` for offline parity; `disabled` in production EAS). `customerAccountResource.ts` routes each resource. In **fixtures** mode, `topBrand` and `homeBanner` still fetch live admin config when `EXPO_PUBLIC_API_URL` is set (fixtures placeholder until resolve; success uses `source: "backend"`). **Backend** wires directories, ranked search, shop policy/terms, missing orders, favorites, and my-offers; auth-gated writes need Firebase session. **Out of scope for backend:** Crossmint auth, Web3/ethers (Connect Wallet login, MiniPay SIWE, on-chain withdraw, crypto payout tab) — see `src/api/backendIntegrationScope.ts` and [docs/api-integration.md](./docs/api-integration.md).
- **Imports:** path alias `@mobile/*` → `src/*` (`tsconfig.json`, both vitest configs).

## Where to start (by task)

| Area                          | Entry points                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Routes (file-based)           | `app/_layout.tsx` (Stack.Protected), `app/(tabs)/_layout.tsx`, e.g. `app/withdraw/index.tsx`, `app/login.tsx` |
| Desktop profile shell + rail  | `src/components/AccountPageShell.tsx` — rail on desktop, bottom nav on mobile; subpages render as children     |
| Screens                       | `src/screens/Customer*.tsx`                                                                                    |
| Auth / session                | `src/auth/session.ts` (MobileSession store + `notifyMobileSessionChange`), `useAuthGuardSession.ts`, `routeGuard.ts`, `useMobileLogout.ts` |
| Session fields / env          | `src/config/mobileAppConfig.ts` (`mobileSessionFields`), `src/config/env.ts` (`getMobileEnv`)                  |
| Web-parity copy + fixtures    | `src/design/webDesignParity.ts`                                                                                |
| Navigation model              | `src/navigation/routes.ts` (`mobileParityRoutes` + `requiresAuth`), `src/navigation/profileSectionNav.ts`     |
| Shared UI                     | `src/components/BrandCard.tsx` (compact `size="S"` / Top Brands `size="L"`), `CustomerDesktopFooter.tsx`, `CustomerDesktopHeader.tsx`, `MotionPressable.tsx`, `KeyboardAwareScreen.tsx`, `Toast.tsx`, `Skeleton.tsx` |
| Desktop shell / footer        | Header: full viewport width. Footer: same full-bleed band (`marginLeft: -horizontalPadding`, `width: viewportWidth`); **inside page `ScrollView`** in `desktopFooterCap`, not a flex sibling below scroll. Pass `horizontalPadding={getDesktopShellOffset(width)}` when the cap is centered at 1440px. |
| Dark mode / theming           | `src/theme/ThemeProvider.tsx`, `useThemedStyles.ts`, `AppearanceSection.tsx`, `CustomerAccountSettingsScreen` — System / Light / Dark preference in Account Settings. Customer app only; admin has its own theme. |
| GoGoTrack (Android detection) | `src/gototrack/*` (detector → session → hooks), `src/screens/CustomerGoGoTrackScreen.tsx`, native `modules/gototrack-detector/`. **Inject the live `gototrackDetector` from the route, never import `detectorInstance` in the screen** — it pulls `expo-modules-core`, which crashes the happy-dom render harness. Data hooks resolve `null` off-device → static fallback. See [README.md#gototrack--android-cashback-detection](README.md). |

## Commands — the three gates (verify before claiming done)

```bash
npm --prefix apps/app run test           # node logic + source-parity suite (*.test.ts, vitest.config.ts)
npm --prefix apps/app run test:render    # happy-dom render suite (*.render.test.tsx, vitest.render.config.ts)
npm --prefix apps/app run typecheck      # tsc --noEmit
```

- `npm --prefix apps/app run test:full` chains all gates + a web export. `npm --prefix apps/app run web` runs the Expo web build (the live-verify surface). From the repo root, `turbo run test --filter=@gogocash/mobile` runs the suite through Turborepo.
- **"Done" = all three gates green AND, for visual/interaction changes, live-verified on Expo web.** Typecheck/lint alone is not sufficient for UI.

## Testing conventions

- **Two suites, two configs**, chosen by file suffix: node `*.test.ts` (logic + **source-grep parity tests**) and happy-dom `*.render.test.tsx` (mount + drive UI with `@testing-library/react`).
- **Parity tests** assert the source contains the web-matched copy/structure/tokens (`src/__tests__/*-parity.test.ts`). For new behavior, write a render test that drives the flow **RED → GREEN**.
- **Render-test seam:** screens that pull in the shell/header reach `expo-localization`; stub it with `vi.mock("expo-localization", …)` (pattern in `customer-wallet.render.test.tsx`). `@sentry/react-native` is aliased to a stub in `vitest.render.config.ts`.
- **Live verification (Expo web) is the real proof** for visual/interaction work: drive with real gestures (programmatic `el.focus()`/`el.click()` may not fire React synthetic handlers); the preview console buffer is **append-only** (use sentinel `console.log` markers to isolate a window); expo-router web nav updates the URL **asynchronously** (read `location.pathname` after a short wait).

## react-native-web gotchas (keep the web console clean)

Guarded by `src/__tests__/web-style-deprecation-parity.test.ts` and `src/__tests__/input-focus-parity.test.ts`:

- **Deprecated style props → cross-platform form** (RN 0.86 + rnw 0.21):
  - `...shadows.card` → `boxShadow: shadows.cardCss`
  - `textShadow*` → `Platform.select({ web: { textShadow: "…" }, default: { textShadowColor/Offset/Radius } })`
  - `pointerEvents="none"` (prop) → `style={{ pointerEvents: "none" }}`
- **Focus rings:** suppress the browser's orange UA outline with `outlineColor: "transparent"` + `outlineWidth: 0`; convey focus with a `colors.primary` border.
- **Flex defaults differ:** a bare rnw `View` is `flex-shrink: 0` (web default is 1), so a `width: "100%"` sibling can starve a `flex: 1` neighbor — wrap intentionally.

## Conventions agents should follow

1. **Scope:** change only what the task requires; match sibling screens. Profile-section pages wrap content in `AccountPageShell` (`activeRouteId="wallet" | "quest" | "profile"`, `showProfileRail`), not a bespoke standalone frame.
2. **Parity:** when matching a web screen, read the corresponding `../../src` component first — it is the source of truth for copy, layout, and behavior.
3. **i18n:** render user-visible copy through `tc("…")`; never hardcode bypassing `tc`. Thai resolves from the reused web catalogs.
4. **Accessibility:** give `Pressable`s `accessibilityRole="button"` + an `accessibilityLabel`; custom dropdowns also set `accessibilityState={{ expanded }}`.
5. **Verify:** run the three gates; live-verify UI on Expo web before saying "done".

## Repository facts (avoid surprises)

- **Desktop breakpoint = 1024** (`mobileShellLayout.desktopBreakpoint`): `width >= 1024` is desktop (rail), below is mobile (bottom nav).
- **`AccountPageShell` is the single source of the desktop rail:** `showDesktopRail = isDesktop && (showProfileRail || isProfileSectionPath(pathname))`. New profile-section pages should render through it so they appear as subpages with the rail/submenu.
- **Auth:** `CustomerAuthScreen` uses Firebase phone OTP → backend session when `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE` is `backend` (or fixtures with API URL). **Fixtures-only** (no API URL) keeps the demo code path. Social providers are stubbed ("Coming soon") under backend mode via `resolveAuthSocialProviders` ([docs/api-integration.md](./docs/api-integration.md) §5).
- Commit/push only when asked; keep changes scoped to your task (a parallel desktop-parity effort may have other files uncommitted — do not stage files you did not change).

When in doubt, search `apps/app/src` for an existing pattern before introducing a new abstraction.

## Learned User Preferences

- Dark mode scope is **customer app only** (`apps/app`); do not add tri-state theme work to admin as part of mobile tasks.
- Ship **System / Light / Dark** in Account Settings from day one — not a system-only v1 with toggle deferred.
- Core customer-app dark mode (screens + shared chrome + GoGoTrack) is **shipped**; optional follow-up is semantic status/metric pastels on a few content screens (Discovery, Quest, etc. — wallet is the template).
- No Next.js customer-web dark tokens exist — draft palette in-repo (`colorPalettes.ts`, `docs/dark-mode.md`).
- Category/store grids should reuse home compact **`BrandCard` (`size="S"`)**, not bespoke per-screen card layouts.
- Keep Expo web preview console clean on main routes — no RN Web deprecation warnings, no broken fixture logo CDN 404s.
- Verify admin **Brands Management** against the customer app on **real API** (shared host) — admin mock mode does not persist to the customer app.
- Do not wire **Crossmint**, **Customer.io**, or **Web3/ethers** flows under mobile `backend` mode — Firebase phone OTP + bank/PromptPay only; the crypto payout tab is **already correctly excluded** in backend mode (`backendIntegrationScope`) — do not “fix” or reintroduce it.
- Wire real **Firebase phone OTP** on `/login` (not demo code only); misconfig often surfaces as generic “Could not complete your request” until `EXPO_PUBLIC_FIREBASE_*`, reCAPTCHA, and authorized domains are set.
- When user reports customer **sign-in** failures on `/login`, investigate Firebase OTP (reCAPTCHA, authorized domains, `EXPO_PUBLIC_FIREBASE_*`) and the `/register` path — not admin staging credentials.
- **Brand directory** store cards (`BrandDirectoryStoreCard`) show logo, name, and cashback only — **no category line** (shop directory cards still show category · shop type).
- **Promotion by Brands** carousel (`ShopDirectoryPromo`) should feel premium — reuse home patterns (`CarouselDots`, snap paging, `getCarouselPageMotionStyle`, `expo-image`), not a one-off free-scroll carousel.

## Learned Workspace Facts

- Monorepo sibling apps for local dev: `apps/api` NestJS **:8080**, `apps/admin` Next.js **:3000**, `apps/app` Expo web **:8081**. **Local UI + staging data:** set `EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co`, `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend`, `EXPO_PUBLIC_FRONTEND_URL=http://localhost:8081` — no local API/Mongo required. **Hosted staging:** `https://api-staging.gogocash.co`, admin `https://admin-staging.gogocash.co`.
- npm workspaces hoist inconsistently — run `npm ci` at the monorepo root; if `-w` workspace dev commands fail module resolution, start from `apps/app` or `apps/admin`, or run the API with `NODE_PATH=./node_modules node dist/main`.
- Theme preference persists under `gogocash.theme.preference` (web `localStorage`, native `expo-secure-store`); default is `system`.
- **Cookie consent banner** dismissal persists under `pdpa_consent_banner_dismissed_v1` via `src/pdpa/cookieConsentStorage.ts` (web `localStorage`, native `expo-secure-store`). `CustomerCookieConsentBanner` async-hydrates on native to avoid flash; accept/dismiss writes before hiding. Re-show only on fresh install, app-data clear, or future policy-version / withdrawal hooks — not on JWT session expiry. Account Settings **data export** must POST **`/pdpa/data-export`** via `createPdpaApi` (`src/pdpa/api.ts`) — not a fake toast.
- New themed UI: `useThemedStyles(createStyles)` + `useTheme()` for live colors; use `colors.field` / `colors.fieldMuted` / `colors.link` for nested controls on cards (not `colors.white` as a surface). Parity-pinned light hex: `pickThemed(colors, light, dark)` from `colorPalettes.ts`. Gate web-only light `backgroundImage` gradients with `colors.isDark`. Frosted white pills (`rgba(255,255,255,…)`) paired with `colors.ink` are invisible in dark mode — use `pickThemed(…, colors.card)`.
- **`/shops`** is the cashback **All Shops** directory (`CustomerDiscoveryScreen`, `routeId="shops"`); commerce catalog MVP stays at **`/catalog`** — do not wire `/shops` to `CustomerCatalogHomeScreen`.
- Shared **`BrandCard`** (`src/components/BrandCard.tsx`): `size="S"` compact (Trending Brands rails, category grids), `size="L"` Top Brands (coupon chip + heart).
- Scaled compact grid cards: **`getScaledCompactBrandCardMetrics()`** in `webDesignParity.ts` — logo area scales with column width; card height must reserve fixed **`compactBrandMetaHeight`** (typography stays 14px/16px).
- Shop/brand directory desktop grid: **`getShopDirectoryGridMetrics`** caps at **5 columns** for ≥1024px (`/shops` and `/brand` share the helper).
- Desktop home brand rails (Top Brands, Trending, Travel, Makeup): **2 rows** via **`getDesktopBrandColumnsPerRow()`**; carousel page width = **`brandSectionFrameWidth`** (not the old fixed 8-column strip). Mobile/tablet keep 3-column × 2-row sliding groups.
- Cashback card label copy is **`Cashback upto`** (no space) — `webDesignParity.cashbackLabel` + i18n; do not revert to "Cashback up to".
- Home desktop spacing tokens: `desktopHomeTopGap` (64), `desktopHomeStackGap` (40), `desktopFooterTopMargin` (40), `desktopFooterTopPadding` (56) — do not also gap the scroll container before the footer (that stacks empty space).
- Admin ↔ customer E2E: admin `NEXT_PUBLIC_API_URL` must match customer `EXPO_PUBLIC_API_URL` (otherwise admin mock `/api/mock`, ids like `o1`); public `GET /offer/top-brands` omits **disabled** offers until enabled in Brands Management. **Home banner schedule:** `homeBannerResource.ts` treats admin date-only start/end as local calendar days (same-day start shows immediately).
