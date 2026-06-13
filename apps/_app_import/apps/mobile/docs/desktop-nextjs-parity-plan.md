# Desktop Next.js Parity Plan

## Objective

Align the Expo customer web desktop experience with the local Next.js reference at `http://localhost:3001/en`, while keeping the Expo app production-ready for web, iOS, and Android. The reference contract is visual, functional, and behavioral: layout geometry, assets, copy, links, interactions, console cleanliness, and responsive breakpoints must match before a route is considered done.

## Reference And Target

- Reference app: `gogocash_app-staging`, usually `http://localhost:3001/en`.
- Expo target: `apps/mobile`, usually `http://localhost:19006`.
- Desktop checkpoints: `1024x768`, `1440x900`, `2048x1005`.
- Mobile regression checkpoints: `390x844`, `427x919`.
- Primary parity files:
  - `src/features/**`, `src/components/layouts/**`, `src/messages/en.json` in Next.js.
  - `apps/mobile/src/design/webDesignParity.ts`, `apps/mobile/src/screens/**`, `apps/mobile/src/components/**` in Expo.

## Acceptance Criteria

1. Desktop route renders the same first viewport and footer viewport as Next.js at the checkpoint sizes.
2. Navigation, buttons, links, form states, dialogs, dropdowns, social buttons, cookie banner, LINE FAB, and footer all work.
3. No browser console errors, actionable warnings, hydration/runtime warnings, broken assets, or 404s.
4. No desktop-only UI appears on mobile unless Next.js also does so.
5. Tests include a RED parity contract before implementation, then focused green tests, full mobile tests, typecheck, Expo web export, and browser screenshots.
6. Visual QA records screenshots for reference and Expo with filenames that include route, viewport, and app.

## Current Status (2026-06-06)

The desktop parity work has moved beyond the initial shell/auth gap. Current tests cover the desktop shell, footer, cookie banner, GoGoLink banner, auth phone/social/OTP contract, public directory pages, shop/category detail pages, account/profile surfaces, metadata, production env, app links, and typography.

GitHub handoff is complete on branch `expo-module` at commit `e605c59 feat(mobile): add Expo customer app parity implementation`. The temporary branch `codex/expo-desktop-navbar-footer` was deleted after `expo-module` was pushed and set to track `origin/expo-module`.

The selected `/link-mycashback` intro surface now has a dedicated Expo parity contract and live proof: desktop header/nav, light-blue sign-in band, connector assets, exact copy, Skip / Link Account CTAs, desktop footer, and clean desktop/mobile browser checks.

The latest deep-scan parity pass also replaced remaining generic Expo shells with dedicated customer-route behavior for MyCashback sign-in, auth callback, age verification, membership/pricing/billing, profile offers, phone/OTP, `/profile/my-rating` redirect, and all GoGoSense hub/onboarding/permission/timeline/settings/recovery/merchant routes. `mobile:design-qa` is green against the live Expo server with 77 passed checks / 3 desktop-only mobile skips, and Expo web export passes.

The security/parity completion pass added a global Expo protected-route guard, allowlisted callback redirects, production fixture-data blocking, production-disabled raw token callback handling, native logout/session clearing, dynamic route parameter normalization, profile wallet identity binding to the stored mobile session, telemetry redaction, and an Expo web session-store fallback so protected routes do not crash on `expo-secure-store` web shims. Final local gates are green: `npm run lint`, `npm run mobile:test:full`, and `MOBILE_PLAYWRIGHT_NO_SERVER=1 npm run mobile:design-qa`.

Follow-up route-matrix smoke on `2026-05-26` checked all 39 tracked customer routes on `http://localhost:19006`; Expo returned content with no overlays or actionable console issues on all 39 routes. Selected changed-route screenshots were saved to `/tmp/gogocash-followup-evidence`. The local Next reference on `http://localhost:3000/en` is not currently clean for strict comparison because `/_next/static/chunks/src_features_10.enuq._.js` returns 404 on every checked route, and unauthenticated protected routes redirect to `/en/login?callbackUrl=...`.

Cosmetic pass on `2026-05-27`: compared the live Next reference on `http://localhost:3001/en` and Expo web on `http://localhost:19006` across desktop/mobile home, login, privacy-policy, shop, and sampled protected routes. The pass fixed auth mobile spacing/social-grid drift, shared the cookie banner across home/auth/privacy, extracted the LINE FAB into a shared public-shell component, and replaced the blue Expo privacy-policy legal wrapper with the Next-style public header/background/bottom-nav/cookie shell. Validation passed: 32 Vitest files / 223 tests with 7 todo, focused lint, `npm run typecheck`, Expo web export, and a Playwright screenshot matrix with no actionable console logs.

Protected-state pass on `2026-05-27`: added `CustomerRouteState` as the shared Expo route-state surface and wired it into app font loading, protected-route session checks, offline retry, production fixture blocking, and auth callback states. Validation passed with RED parity coverage, `npm run test:full` (33 files / 226 tests / 7 todo, typecheck, Expo web export), and a Playwright live smoke on mobile protected redirect, mobile offline protected state, and desktop auth-callback missing-link state with no captured console warnings/errors. Screenshot evidence was saved under `/tmp/gogocash-route-states-*.png`.

Account-resource pass on `2026-05-27`: added a source-aware backend boundary for profile, wallet, referral, profile offers, shop detail, and billing/subscription. In fixture mode these routes keep the current Expo-vs-Next visual screens; in backend mode they now fetch through the existing mobile API client/session store and render shared loading, empty, error, offline, or disabled states instead of stale fixture content. Validation passed with RED parity coverage, focused tests/typecheck, backend-mode Expo web export, and Playwright proof that `/wallet` calls `/withdraw/check` with the stored bearer token and renders retryable error/offline states at mobile and desktop viewports.

Locale-region header pass on `2026-05-27`: matched the Next.js `LocalePanel` desktop flow in Expo for both the home-specific desktop header and shared desktop header. The globe trigger now opens a `Choose language and region` dialog with English/Thai language rows, Thailand-first region rows, selected states, scrollable region content, and header stacking that keeps the LANGUAGE section visible above the category nav. Validation passed with RED parity coverage, `npm run test:full` (34 files / 230 tests / 7 todo, typecheck, Expo web export), and Playwright smoke with no captured console issues. Screenshot evidence: `/tmp/gogocash-locale-region-popover-desktop-fixed.png`.

Locale-region motion pass on `2026-05-27`: extracted the Expo desktop locale trigger/popover into a shared `CustomerLocaleRegionControl` and matched the Next.js motion contract. The globe scales when open, the popover fades/slides from the top over the shared base duration, and close runs a reverse animation before unmounting. Validation passed with RED parity coverage, `npm run test:full` (34 files / 231 tests / 7 todo, typecheck, Expo web export), and Playwright proof on `/login` that opening and closing expose animated opacity/transform states with no captured console issues. Screenshot evidence: `/tmp/gogocash-locale-motion-login-open.png`.

Sign-in header graphic pass on `2026-05-27`: matched the unauthenticated Next.js desktop `Sign in` pill by replacing Expo live text with the same 160x48 vector graphic contract in both the home-specific desktop header and shared desktop header. Validation passed with RED parity coverage, `npm run test:full` (34 files / 231 tests / 7 todo, typecheck, Expo web export), and Playwright smoke confirming one SVG inside the 160x48 `Sign in` link, no rendered text node, and no captured console issues. Screenshot evidence: `/tmp/gogocash-signin-nav-graphic-expo.png`.

Desktop route chrome pass on `2026-05-27`: added root desktop navbar coverage for routes that do not own a public shell and added shared desktop footer slots to the route shells that own scroll content. Self-owned public pages (`/`, `/login`, `/register`, `/account-setup`, `/privacy-policy`, `/link-mycashback`, and `/link-mycashback/my-cashback-sign-in`) keep their local desktop shell but now include both navbar and footer. Validation passed with RED parity coverage, `npm run test:full` (35 files / 232 tests / 7 todo, typecheck, Expo web export), and Browser smoke on `/brand`, `/login`, and `/privacy-policy` with no captured console issues. Screenshot evidence: `/tmp/gogocash-desktop-chrome-brand-top.png`, `/tmp/gogocash-desktop-chrome-brand-footer.png`, `/tmp/gogocash-desktop-chrome-login-footer.png`, `/tmp/gogocash-desktop-chrome-privacy-adjusted.png`.

Remaining desktop-launch work is now external-proof heavy: refresh the Next.js reference server to remove the stale chunk 404, capture desktop/mobile screenshots beside the clean reference route matrix, and confirm production-like API/auth/billing behavior. Backend-bound routes now have guarded non-ready states, but live authenticated success-payload mapping and real API proof are still required before production sign-off, plus Expo web export, EAS, and iOS/Android device smoke after the latest local footer/navbar changes.

Latest local green gates for the 2026-06-06 footer/navbar pass: focused shell/footer tests passed (33 tests), home parity passed (32 tests), full source suite passed (53 files / 407 tests), render suite passed (38 files / 238 tests), typecheck passed, and Browser validation passed on `/login` and `/` at `1509x828` plus a mobile guard at `390x844`. Expo web export was not rerun in this pass.

Full desktop parity sweep on `2026-05-31`: measured all 45 customer routes (desktop 2000 + mobile 390) Expo-vs-Next with Playwright DOM measurement. Result at the time: **zero genuine misalignments** — but that "zero" was incomplete. The sweep's footer heuristic missed a genuine misalignment: the directory/category (`/brand`, `/shops`, `/discover`, `/category/*`) white footer card was capped at 1440 and centered with gray gutters, not full-bleed like home. The heuristic measured RN-web internal-scroll footers pre-layout (by clipped geometry), so it never flagged it; the gap was caught later from user screenshots and fixed in `7a1baf0` (see the directory/category footer pass below). The one real defect caught during the sweep itself — the home desktop header/footer were trapped inside the `phoneFrame` 1440 cap instead of full-bleed — was fixed in `ce8de6a` (chrome lifted out of the cap, content stays centered at the 1440 column). Verified at vw=2000: header bar L0–R2000, header content L280–R1720, footer full-bleed, matching staging. All other workflow/sweep "misalignment" flags were measurement false positives (horizontal carousels reporting child rects past a clipped viewport; off-screen `translateX` animation drawers; "find footer/section by geometry" picking different DOM nodes per app; RN-web internal-scroll footers measured before layout). Robust signals are page-level `scrollWidth > innerWidth`, the logo's capped-ancestor for header content, and the dark footer band located by background color.

Desktop category/header UI pass on `2026-06-01`: fixed three reported bugs on the category page, each ground-truthed against the live Next reference and then re-measured. (1) Active top-nav state is now route-derived (`usePathname()` in `CustomerDesktopHeader`) instead of the hardcoded `webDesktopHeaderNavItems.active` — the current tab underlines and the sidebar highlights the route category (verified Health & Beauty / Travel). (2) Sort pills matched to Next's `14px / 600 / lineHeight 20 / padding 6×16` (were 16px/weight-dropped). (3) Persistent RN-web focus-outline box on the logo + header pressables + sidebar items + sort pills removed via a `webPressableFocusReset` (`outlineStyle/Width:0`); `<Link asChild>` children use `StyleSheet.flatten([...])` because an array style to a `<Slot>` crashes expo-router at runtime (caught only by live page load, not by the vitest gates). (4) Sort label "High Cashback" → "Highest Cashback" in both `webDesignParity.ts` and the web i18n `discoverSortHighCashback` key (en/th/jp) so Expo and the Next reference stay in sync. (5) PostHog keyless dev-error toast removed: `AppProviders` now always mounts `<PostHogProvider>` (no-op client + `autocapture={false}` when no key) so `usePostHog()` never console.error's. Commits `54add48` → `a593f6a` → `265bb85`, each gated render+source+tsc all 0; live-verified zero `usePostHog` console errors and the corrected labels/states.

Directory/category footer full-bleed pass on `2026-06-01` (`7a1baf0`): the white footer card on `/brand`, `/shops`, `/discover`, and `/category/*` was capped at 1440 and centered (measured live at vw=1940: whiteCard L250–R1690 W1440), leaving gray gutters on either side instead of going full-bleed like home. Root cause: the footer breaks out to full-bleed via negative margin + a full-width white background, but an ancestor `ScrollView` inside the screen's 1440-capped `phoneFrame` has `overflowX:hidden` at width 1440, which clipped the footer's full-bleed white back to the centered 1440 window. (Home was already correct because `ce8de6a` mounts its footer in a full-width shell outside the cap.) Fix: applied the proven home pattern on `CustomerCategoryDetailScreen` and the `CustomerDiscoveryScreen` sub-screens (which cover `/brand`, `/shops`, `/discover`) — on desktop the footer is lifted out of the 1440 cap (full-width shell + full-bleed `ScrollView`; page content wrapped in a 1440-centered `desktopContentCap`; footer in an uncapped `desktopFooterCap` rendering `<CustomerDesktopFooter horizontalPadding={0} viewportWidth={width}/>` directly, not the `<Slot>`); the mobile branch is unchanged (forked on `isDesktop`). Verified after (live `:8081`, vw=1940): footer whiteCard now L0–R1940 W1940 (full-bleed) on `/brand`, `/shops`, `/discover`, and `/category/Travel`, matching home; page content still caps and centers at 1440 (contentCap L250–R1690 W1440); no horizontal overflow (`scrollWidth == innerWidth`); mobile `/brand` @390 unchanged. Gate render+source+tsc all exit 0.

Superseded detail: the 2026-06-06 footer/navbar pass keeps the same full-bleed outcome but no longer leaves capped desktop footers at `horizontalPadding={0}`; capped pages now pass `getDesktopShellOffset(width)` so narrower desktop widths such as `1509px` also start the footer band at viewport `x=0`.

Footer/navbar tightening on `2026-06-06` (local, uncommitted): user screenshots exposed two narrower footer cases that were different from the earlier 1940px directory/category bug. First, `/login` had a page-level `56px` desktop padding; the footer component now receives that padding and uses `marginLeft: -horizontalPadding` plus `width: viewportWidth`, with its inner content lane set by `getDesktopShellContentWidth(viewportWidth)`. Second, `/` and other capped desktop pages can render the footer inside a centered `1440px` cap; `getDesktopShellOffset(viewportWidth)` now supplies the centered-cap offset so the footer white band starts at viewport `x=0` even when the parent remains `x=35 width=1440` at `1509px`. The footer logo was also unified with the navbar logo through `CustomerDesktopBrandLink`. Live Browser proof on `/login` and `/` at `1509x828`: navbar outer and footer outer both measured `x=0 width=1509 right=1509`; `scrollWidth=1509`; console logs were clean; mobile `390x844` kept the desktop footer absent. Screenshot evidence: `/tmp/gogocash-footer-width-navbar-after.png`, `/tmp/gogocash-home-footer-full-width-after.png`.

## Workstreams

### 1. Desktop Shell Baseline

Scope: app-wide header, category nav, cookie banner, LINE FAB, footer, max-width behavior, and page background.

Tasks:

- Verify current desktop shell against Next.js after the footer change.
- Add route-level shell fixtures to `webDesignParity.ts`: header/nav/footer/cookie/FAB visibility rules.
- Create a desktop shell e2e helper that checks header/footer/cookie/FAB consistently across migrated routes.
- Lock console cleanliness with `attachPageErrorCollector`.

Tests:

- `web-design-parity.test.ts`: shell data contract.
- `design-parity.spec.ts`: shell visible on desktop, mobile bottom nav remains mobile-only.

Rollback:

- Remove shell helper assertions and return route tests to route-specific checks.

### 2. Sign-In And Register Desktop Parity

Scope: `/login` and `/register`. This was the original visible mismatch; the current implementation now has the Next.js phone/social/OTP parity contract, with live backend handoff and browser/device proof still required before production sign-off.

Next.js reference details:

- Desktop two-column layout inside a centered `max-w-[1440px]` shell.
- Left hero image: `/images/auth-login-hero.png`, `588x690`, rounded `24px`, `2px #e4e4e4` border.
- Right auth card: `600px` desktop max width, `690px` height, rounded `24px`, white background, `2px #e4e4e4` border.
- Logo mark centered at top, green `Sign in` / `Sign up` title, subtitle.
- Country selector row with Thailand flag and dropdown affordance.
- Phone sign-in form with `+66` dial code box, phone number input, privacy checkbox.
- Disabled/enabled CTA states.
- Social divider and desktop `4 + 3` social grid: Facebook, Gmail, Telegram, Apple, X, Microsoft, Connect Wallet.
- OTP phase: six boxes, masked phone, change number, resend timer, next button.

Expo current follow-up:

- Keep `CustomerAuthScreen` aligned with the Next.js phone/social desktop contract while connecting the real auth handoff, error states, and browser/device proof.

Tasks:

- Copy/reference auth hero and social icon assets into Expo assets.
- Add `webAuthPage` contract to `webDesignParity.ts` for copy, layout metrics, countries, providers, OTP strings, and privacy copy.
- Implement responsive `CustomerAuthScreen`:
  - Desktop: two-column Next.js layout.
  - Mobile: keep the same phone/social auth flow in a compact single-column layout.
- Build local country selector behavior without MUI.
- Add privacy checkbox state and disabled/enabled CTA logic.
- Add OTP phase state machine with deterministic mock verification for local QA.
- Ensure `/register` reuses the same component with sign-up copy.

Tests:

- `auth-design-parity.test.ts`
  - `auth desktop parity > given Next login reference > then Expo renders hero form social grid and phone contract`
  - `auth behavior > given phone privacy and OTP flow > then CTA states and OTP transition match`
- `design-parity.spec.ts`
  - `/login > given desktop Next auth reference > then layout, assets, social grid, and console are clean`
  - `/register > given desktop Next auth reference > then sign-up copy and form contract match`

Rollback:

- Route `/login` and `/register` back to the previous `CustomerAuthScreen` implementation and remove auth parity tests/assets.

### 3. Icon System

Scope: shared icons across desktop and mobile.

Tasks:

- Decide and lock the icon source. If Phosphor is required, use `phosphor-react-native` with `react-native-svg` through a local `app-icons` adapter.
- Replace direct icon-package imports with adapter imports.
- Preserve existing `color`, `size`, and current stroke/weight visual intent.
- Verify web, iOS, and Android compatibility through Expo Go where possible and web export for browser.

Tests:

- Dependency test confirms `react-native-svg` and the chosen icon package.
- Source scan confirms app code imports from the adapter, not package-specific paths.
- Browser smoke confirms icons render in header, nav, forms, account pages, and footer.

Rollback:

- Restore prior icon imports and dependency.

### 4. Home Desktop Completion

Scope: `/` desktop home.

Tasks:

- Compare hero banners, side banners, GoGoLink banner, Top Brands, promo rails, footer spacing, and cookie overlay against Next.js.
- Add pixel/geometry checks for desktop widths, not just mobile rails.
- Verify carousel arrows/dots and GoGoLink dialogs.

Tests:

- Extend existing home/design parity tests for desktop geometry.
- E2E full-page screenshot at `1440x900` and `2048x1005`.

Rollback:

- Remove only the latest desktop geometry assertions and component changes.

### 5. Directory And Discovery Desktop Pages

Scope: `/brand`, `/shops`, `/discover`, `/category`, `/category/[name]`, `/shop/[id]`.

Tasks:

- For each route, extract Next.js data/copy/layout contract into `webDesignParity.ts`.
- Align desktop sidebars, filters, search inputs, card grids, pagination, detail sections, and route links.
- Confirm dynamic placeholder routes do not leak into sitemap or public links.

Tests:

- Route-specific parity tests already exist; extend each with desktop layout metrics.
- E2E per route with console checks and screenshot artifacts.

Rollback:

- Restore route to current Expo component and remove the latest route-specific contract.

### 6. Account And Profile Desktop Pages

Scope: `/profile`, `/wallet`, `/quest`, `/quest/history`, `/referral`, `/missing-orders`, `/favorite`, `/credit-score`, `/method`, `/language`, `/privacy-center`, subscription/billing/pricing routes.

Tasks:

- Compare Next account shell rails, cards, banners, menu rows, and action states.
- Align desktop density and shell widths separately from mobile.
- Verify external links and support flows.

Tests:

- Account hub parity tests for desktop shell, profile rail, wallet summary, quest tabs, referral sharing, and missing-order form.
- E2E route group smoke with console checks.

Rollback:

- Revert per route to previous account screen and remove route assertions.

### 7. Legal, Metadata, And Production Web Export

Scope: browser identity, sitemap, legal pages, app shell metadata.

Tasks:

- Keep favicon, manifest, sitemap, robots, social metadata, privacy page rendering, and Cloudflare footer mark aligned.
- Run `npm --prefix apps/mobile run export:web` after every desktop route group.
- Serve exported `dist` for one final browser pass before launch.

Tests:

- `web-metadata-parity.test.ts`.
- Export smoke plus console scan.

Rollback:

- Revert metadata/public file changes and regenerate current sitemap.

## Execution Order

1. Freeze reference screenshots for `/login`, `/register`, `/`, `/brand`, `/shops`, `/discover`, `/category`, `/profile`, `/wallet`, `/quest`, and `/privacy-policy`.
2. Finish `/login` and `/register` first because they are visibly non-parity and share auth assets/state.
3. Re-run shell/home/footer checks to ensure auth changes do not break global layout.
4. Complete directory/discovery routes.
5. Complete account/profile routes.
6. Do icon system migration once the main desktop surfaces are stable, unless a route needs it earlier.
7. Run full production verification.

## Verification Stack

For every route slice:

```bash
npm --prefix apps/mobile run test -- <focused-test>
npm --prefix apps/mobile run test
npm --prefix apps/mobile run typecheck
MOBILE_PLAYWRIGHT_NO_SERVER=1 MOBILE_PLAYWRIGHT_BASE_URL=http://localhost:19006 npx playwright test --config apps/mobile/playwright.config.ts --project mobile-web-wide -g "<route>"
npm --prefix apps/mobile run export:web
```

Browser proof:

- Desktop screenshot at `1440x900` and `2048x1005`.
- Mobile smoke at `390x844`.
- Console: zero errors and zero actionable warnings.

## Parallelization

- Agent A: reference extraction from Next.js components/messages/assets.
- Agent B: Expo parity constants and RED tests.
- Agent C: Expo component implementation.
- Agent D: Playwright screenshot/console QA and regression report.

Only one route group should be merged into the main working tree at a time so failures stay easy to isolate.
