# Expo app — UX/UI improvements plan (sub-agent execution)

Derived from the bug-hunt UX review. Goal: add the native-mobile affordances that web-parity didn't
capture (keyboard avoidance, perceived-performance, haptics, reduce-motion, refresh, full i18n of states).

## Status
- **Wave A (foundations A1–A7): ✅ COMPLETE** — gate green: `typecheck` 0 · source **314** · render **73** · `export:web` builds.
  New primitives shipped: `useReducedMotion` + reduce-motion-aware `MotionPressable` (A1), `lib/haptics`
  (A2, `expo-haptics ~56.0.3` installed), `Skeleton`/`SkeletonText`/`WalletSkeleton` (A3),
  `KeyboardAwareScreen` (A4), flash-free `LocaleProvider` hydration (A5), ICU-localized route/resource
  states (A6, +28 overlay keys, `gen:i18n-review` → 332 rows), `Toast`/`useToast` mounted in `AppProviders` (A7).
  Reconciliation fixes (central): updated `motion-interaction-parity` literals to `effectiveHoverLift`;
  `keyboard-aware-screen` test passes children via props; `i18n-wave2-tc-coverage` integrity test now
  distinguishes reverse-lookup vs keyed-ICU overlay entries.
- **Wave B (per-screen adoption B1–B5): ✅ COMPLETE** — gate green: typecheck 0 · source 314 · render 231 · `export:web` builds. Commits on `expo-module` (PR #5): `ca8ebb7` (B1 auth), `079f7ae` (B2 profile/account), `07bd026` (B3 wallet/money + shared `loadingSkeleton`), `f49659f` (B4 discovery/home), `ab185b4` (B5 engagement).
  - B1 auth/onboarding: KeyboardAwareScreen + OTP/verify haptics (LinkCashback unchanged — input-less landing).
  - B2 profile/account: keyboard + save/verify haptics + copy toast + hitSlop (AccountSettings unchanged — display-only toggles).
  - B3 wallet/money: Wallet skeleton + pull-to-refresh + withdraw haptics; **shared `CustomerRouteState`/`CustomerAccountResourceState` gained an opt-in `loadingSkeleton` prop** so any resource-backed screen can show a content-shaped placeholder.
  - B4 discovery/home: Thai-truncation (`numberOfLines`) everywhere + selection haptics; ShopDetail (async) got skeleton + refresh; Home/Discovery/Category are **synchronous parity data** so skeleton/real-refresh were honestly skipped.
  - B5 engagement: GoLink reduce-motion on sheet/popover enter+exit; Subscription + Referral (async) got skeleton + refresh; Quest/GoGoSense/Membership/CreditScore got haptics + truncation.
  - **Architecture finding:** skeleton + pull-to-refresh apply only to async resource-backed screens (Wallet, ShopDetail, Subscription, Referral). Directory/landing/quest/credit screens render synchronous in-memory `webDesignParity` data — no refetch — so those treatments were skipped there rather than faked.
- **Wave C (dark mode): ✅ COMPLETE (2026-06-22)** — System / Light / Dark in Account Settings; `ThemeProvider`, `colorPalettes.ts`, themed shared chrome + core screens + GoGoSense. See `docs/dark-mode.md`. Gates: typecheck 0 · source 613 · render 303.

## Working rules (every task)
- **TDD** (house rule): write the failing test first, see it fail for the right reason, implement, then
  full suites green. Pure logic → unit test (source suite, `*.test.ts`); anything importing a screen/RN →
  **render suite** (`*.render.test.tsx`, RN is aliased there).
- **Verification gate** (every task's Definition of Done): `npm run typecheck` (0), `npm run test`
  (≥309 pass), `npm run test:render` (≥45 pass) — no regressions — plus the task's own new tests.
- **Parallelism rule:** agents that run concurrently MUST edit disjoint files. Shared files
  (`MotionPressable`, `LocaleProvider`, `CustomerRouteState`, catalogs/overlay) are each owned by exactly
  ONE task. ⇒ **Phase A (shared primitives) completes before Phase B (per-screen adoption).**
- Keep i18n correct: any new user-facing string goes through `tc()`; mobile-only strings → overlay +
  `npm run gen:i18n-review`.
- Don't touch the unrelated login-firebase files.

---

## Phase A — shared foundations (parallel; disjoint files, one owner each)

### A1 — Reduce-motion support
- **Files (owns):** new `src/hooks/useReducedMotion.ts`; `src/components/MotionPressable.tsx`.
- **Do:** `useReducedMotion()` → subscribes to `AccessibilityInfo` (`isReduceMotionEnabled` +
  `reduceMotionChanged` listener; web: `matchMedia('(prefers-reduced-motion: reduce)')`); returns boolean.
  `MotionPressable` skips the press-scale animation (instant) when reduced.
- **Acceptance criteria:**
  - [ ] `useReducedMotion` returns `false` by default and `true` when the platform flag is set (unit test with mocked `AccessibilityInfo`).
  - [ ] Listener is removed on unmount (no leak — assert `remove()` called).
  - [ ] `MotionPressable` render test: mounts and still fires `onPress` with reduced motion on.
  - [ ] tsc + suites green.

### A2 — Haptics utility
- **Files (owns):** new `src/lib/haptics.ts`.
- **Do:** thin wrapper over `expo-haptics` with web/native guard + try/catch (never throws):
  `haptics.success()`, `haptics.impact()`, `haptics.error()`. No-op on web (`Platform.OS === "web"`).
- **Acceptance criteria:**
  - [ ] On web, each method is a no-op and resolves without calling native (unit test, `Platform` mocked).
  - [ ] Errors from the native module are swallowed (call inside try/catch — test it doesn't throw).
  - [ ] `expo-haptics` added to `package.json` deps; tsc + suites green.

### A3 — Skeleton primitives
- **Files (owns):** new `src/components/Skeleton.tsx` (`Skeleton` block + `SkeletonText` lines), respects A1 (no shimmer when reduced — depends on A1, so sequence A1→A3 OR import the hook).
- **Do:** pulse/shimmer placeholder using `Animated`; props for width/height/radius; a `WalletSkeleton`/`ListSkeleton` composite for reuse.
- **Acceptance criteria:**
  - [ ] Render test: `Skeleton` mounts; `accessibilityElementsHidden`/`importantForAccessibility="no-hide-descendants"` set (screen readers skip placeholders).
  - [ ] No animation loop started when reduced-motion is on.
  - [ ] tsc + suites green.

### A4 — Keyboard-aware screen wrapper
- **Files (owns):** new `src/components/KeyboardAwareScreen.tsx`.
- **Do:** wraps children in `KeyboardAvoidingView` (`behavior` per `Platform`) + `ScrollView`
  (`keyboardShouldPersistTaps="handled"`, `keyboardDismissMode`). Drop-in for form screens.
- **Acceptance criteria:**
  - [ ] Render test: mounts, passes children through, exposes a `contentContainerStyle` passthrough.
  - [ ] No-op visual change on web (KeyboardAvoidingView height 0) — does not break existing layout.
  - [ ] tsc + suites green.

### A5 — Locale hydration (kill the en→th flash)
- **Files (owns):** `src/i18n/LocaleProvider.tsx`, `src/i18n/localeStorage.ts`.
- **Do:** read the persisted locale **synchronously on web** (`localStorage.getItem`) for the initial
  state; on native, gate first paint on the async read (render `null`/splash until resolved) instead of
  defaulting to `en` then swapping.
- **Acceptance criteria:**
  - [ ] Unit test: given a stored `"th"`, the provider's initial resolved locale is `"th"` (no `en` intermediate) on the web path.
  - [ ] Existing i18n tests stay green (translateCopy / coverage / overlay-integrity).
  - [ ] Manual: cold-load `/wallet?th` shows no English flash. tsc + suites green.

### A6 — i18n for non-ready states (ICU)
- **Files (owns):** `src/components/CustomerRouteState.tsx`, `src/account/CustomerAccountResourceState.tsx`; catalog/overlay additions.
- **Do:** replace the raw English `routeStateCopy` + interpolated `` `Loading ${label}` `` with real
  `react-intl` `formatMessage` + `{label}` placeholder (this is the deferred interpolation gap). Localize
  resourceLabel values.
- **Acceptance criteria:**
  - [ ] Loading/empty/error/offline/unauthenticated titles+bodies render Thai under `th` (unit/render test asserting non-English output).
  - [ ] `{label}` interpolation works for both locales (e.g. "Loading wallet" → Thai with the localized label).
  - [ ] tsc + suites green; `gen:i18n-review` re-run if overlay grew.

### A7 — Toast / action feedback
- **Files (owns):** new `src/components/Toast.tsx` + `src/hooks/useToast.ts` (or a small context in `AppProviders` — if `AppProviders` is touched, A7 owns it; A5 does not).
- **Do:** lightweight transient toast ("Copied!", "Saved") with auto-dismiss + `accessibilityLiveRegion="polite"`.
- **Acceptance criteria:**
  - [ ] Render test: shows message, auto-dismisses after timeout (fake timers), is announced (live region).
  - [ ] Respects reduced-motion (A1). tsc + suites green.

> **A-phase dispatch:** A1, A2, A4, A6, A7 touch disjoint files → run in parallel. A3 depends on A1
> (import the hook) and A5/A7 may both want `AppProviders` — assign `AppProviders` to A7 only; A5 stays in
> the i18n files. Run A1 first (or hand A3 the hook contract), then A2–A7 in parallel.

---

## Phase B — per-screen adoption (parallel; ONE agent per screen-cluster, disjoint files)

Each cluster-agent applies the relevant foundations to its screens + screen-local fixes (hitSlop for
icon-only buttons <44px, `numberOfLines` Thai-truncation check, real zero/empty states). It imports A1–A7;
it does NOT modify them.

- **B1 — Auth & onboarding:** `CustomerAuthScreen`, `CustomerAuthCallbackScreen`, `CustomerLinkCashbackScreen`, `CustomerAgeVerificationScreen` → KeyboardAwareScreen on inputs; haptics on OTP/verify success; reduce-motion on OTP-cell/consent animations.
- **B2 — Profile & account hub:** `CustomerProfileScreen`, `CustomerProfileDetailScreen`, `CustomerProfilePhoneScreen`, `CustomerProfileOffersScreen`, `CustomerAccountSettingsScreen`, `CustomerMissingOrdersScreen` → KeyboardAwareScreen on forms; toast on copy/save; hitSlop on chevrons.
- **B3 — Wallet & money:** `CustomerWalletScreen`, `CustomerMoneyActionScreen`, `CustomerWithdrawMethodScreen` → skeleton loading; pull-to-refresh; KeyboardAwareScreen on amount/method forms; haptics on withdraw confirm; back-button hitSlop (44).
- **B4 — Discovery & home:** `CustomerHomeScreen`, `CustomerDiscoveryScreen`, `CustomerCategoryDetailScreen` → skeleton loading + pull-to-refresh on directories; Thai-truncation pass on pills/cards; toast on copy.
- **B5 — Quest / membership / gogosense / golink / referral / credit-score:** skeletons + refresh where data-backed; reduce-motion on GoLink sheets/popovers; haptics on key CTAs.

**Per-cluster acceptance criteria (template):**
- [ ] Form screens: source assertion the screen uses `KeyboardAwareScreen` (or `KeyboardAvoidingView`); render test still mounts.
- [ ] Data screens: `RefreshControl` present (source assertion) + render test mounts the loading→ready path with a skeleton.
- [ ] Every icon-only `Pressable`/`MotionPressable` < 44px has `hitSlop` (source check) .
- [ ] Confirm/copy actions call `haptics.*` (source assertion).
- [ ] No new untranslated visible strings (extend `i18n-wave2-tc-coverage` to the cluster, or add coverage block) — Thai still resolves.
- [ ] tsc + full suites green; cluster screens spot-checked in en + th at 320 / 768 / 1440 on Expo web (no truncation/overlap; keyboard doesn't cover the focused input).

---

## Dispatch strategy
1. **Wave A (foundations):** A1 first (tiny), then A2–A7 in parallel (disjoint files). Verify gate after merge.
2. **Wave B (screens):** B1–B5 in parallel (disjoint screen clusters), each consuming A1–A7. Verify gate.
3. Central owner (me) reconciles any shared catalog/overlay additions + runs the global gate after each wave.

## Global Definition of Done
- `npm run typecheck` 0 · `npm run test` green · `npm run test:render` green · `npm run export:web` builds.
- Reduce-motion honored app-wide; keyboard never covers a focused input on the smallest target; data screens have skeletons + pull-to-refresh; non-ready states + all visible copy localized (en/th); key actions give haptic/toast feedback.
- en + th visual pass at 320 / 768 / 1440. No regression to the existing 309 source / 45 render tests.
- Machine-authored Thai (if any new) appended to `docs/i18n-thai-review.md`.
