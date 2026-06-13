# AGENTS.md — GoGoCash Mobile (@gogocash/mobile)

Concise guidance for AI coding agents and contributors working in `apps/mobile/`. **Dev/build basics live in [README.md](./README.md); deeper plans in `FRONTEND_PARITY_PLAN.md` and `MIGRATION_PLAN.md`.**

> This is a **separate npm project** from the web root (`gogocash-web`). Run mobile commands from `apps/mobile/` (or via the root `npm run mobile:*` proxies). The web app (`../../src`) is the **design + behavior source of truth** — this app is a react-native-web parity port of it.

## Project

- **Stack:** Expo SDK 56 + React Native 0.85.3 + **react-native-web 0.21.2**, React 19.2.3, TypeScript (strict). No `react-native-reanimated` — use the `Animated` API + `src/theme/motion.ts`.
- **Routing:** **expo-router** ~56.2.5 (file-based, `app/`). Auth gating via `Stack.Protected` in `app/_layout.tsx`, driven by `useAuthGuardSession` (synchronous-on-first-render so the guard is correct on first paint).
- **i18n:** `tc()` from `src/i18n/useCopy.ts` — a **text-based reverse-lookup** into the reused web ICU catalogs, falling back to the English in `src/design/webDesignParity.ts`. Render copy inline as `tc("English string")`; do not invent new keys.
- **Design tokens:** `src/theme/tokens.ts` (`colors.primary` = `#00CC99`, `radii`, `spacing`, `typography`), icons `src/theme/icons.tsx` (phosphor adapters), motion `src/theme/motion.ts`.
- **Data:** fixture-driven by default, with a live-API seam: `src/account/customerAccountResource.ts` switches on `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE` (`fixtures` default | `backend` | `disabled`). The public offer catalog is already wired live (Favorite Brands screen); auth-gated resources pend real auth. See [docs/api-integration.md](./docs/api-integration.md).
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
| Shared UI                     | `src/components/MotionPressable.tsx`, `KeyboardAwareScreen.tsx`, `Toast.tsx`, `Skeleton.tsx`                   |

## Commands — the three gates (verify before claiming done)

```bash
npm test               # node logic + source-parity suite (*.test.ts, vitest.config.ts)
npm run test:render    # happy-dom render suite (*.render.test.tsx, vitest.render.config.ts)
npm run typecheck      # tsc --noEmit
```

- `npm run test:full` chains all gates + a web export. `npm run web` runs the Expo web build (the live-verify surface). From the repo root use `npm run mobile:test` / `mobile:typecheck`.
- **"Done" = all three gates green AND, for visual/interaction changes, live-verified on Expo web.** Typecheck/lint alone is not sufficient for UI.

## Testing conventions

- **Two suites, two configs**, chosen by file suffix: node `*.test.ts` (logic + **source-grep parity tests**) and happy-dom `*.render.test.tsx` (mount + drive UI with `@testing-library/react`).
- **Parity tests** assert the source contains the web-matched copy/structure/tokens (`src/__tests__/*-parity.test.ts`). For new behavior, write a render test that drives the flow **RED → GREEN**.
- **Render-test seam:** screens that pull in the shell/header reach `expo-localization`; stub it with `vi.mock("expo-localization", …)` (pattern in `customer-wallet.render.test.tsx`). `@sentry/react-native` is aliased to a stub in `vitest.render.config.ts`.
- **Live verification (Expo web) is the real proof** for visual/interaction work: drive with real gestures (programmatic `el.focus()`/`el.click()` may not fire React synthetic handlers); the preview console buffer is **append-only** (use sentinel `console.log` markers to isolate a window); expo-router web nav updates the URL **asynchronously** (read `location.pathname` after a short wait).

## react-native-web gotchas (keep the web console clean)

Guarded by `src/__tests__/web-style-deprecation-parity.test.ts` and `src/__tests__/input-focus-parity.test.ts`:

- **Deprecated style props → cross-platform form** (RN 0.85 + rnw 0.21):
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
- **Auth: demo stub on screen, real plumbing built.** The login screen still verifies a fixed demo code and writes a demo session (`useAuthGuardSession` flips `isAuthed` reactively via `notifyMobileSessionChange`). Real Firebase phone-auth modules exist and are unit-tested (`src/auth/firebaseClient.ts`, `firebasePhoneAuth.ts`, `firebaseLogin.ts` — project `gogocash-staging`, phone provider enabled); wiring them into `CustomerAuthScreen` is the open task ([docs/api-integration.md](./docs/api-integration.md) §5).
- Commit/push only when asked; keep changes scoped to your task (a parallel desktop-parity effort may have other files uncommitted — do not stage files you did not change).

When in doubt, search `apps/mobile/src` for an existing pattern before introducing a new abstraction.
