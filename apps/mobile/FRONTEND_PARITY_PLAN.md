# GoGoCash Mobile Frontend Parity Plan

This plan tracks the native Expo app work needed to match the current GoGoCash customer web UI without using a WebView.

## Current Progress Snapshot (2026-05-28)

Status: the Expo customer app is past the scaffold phase and has been handed off to GitHub on branch `expo-module`. The conversion matrix now marks the customer route catalog as migrated, and tests assert there are no remaining `parity_shell` or `backend_migration` customer routes.

Recently completed:

- 2026-06-01 desktop category/header UI pass (`54add48` → `a593f6a` → `265bb85`): fixed the top-nav active-state (route-derived via `usePathname()` instead of hardcoded `webDesktopHeaderNavItems.active`, so the current tab underlines and the sidebar highlights the route category); matched the category sort pills to Next's `14px/600/lineHeight20/padding6×16`; removed the persistent RN-web focus-outline box on the logo/header pressables/sidebar/sort pills (`webPressableFocusReset`, with `StyleSheet.flatten` on `<Link asChild>` children to avoid the expo-router `<Slot>` array-style crash); renamed the sort label "High Cashback" → "Highest Cashback" across `webDesignParity.ts` and web i18n (`discoverSortHighCashback` en/th/jp); and silenced the keyless `usePostHog` dev-error toast by always mounting `<PostHogProvider>` with a no-op client + `autocapture={false}`. Each commit gated render+source+tsc all 0 and was live-verified against the Next reference.
- 2026-05-31 full desktop parity sweep (`ce8de6a`): measured all 45 routes (desktop + mobile) Expo-vs-Next — zero genuine misalignments; the one real defect (home header/footer trapped in the `phoneFrame` 1440 cap) was made full-bleed and verified at vw=2000. All other audit flags were measurement false positives.
- The Expo customer app parity implementation was committed and pushed to GitHub as `e605c59 feat(mobile): add Expo customer app parity implementation` on branch `expo-module`; the earlier temporary remote branch `codex/expo-desktop-navbar-footer` was removed.
- Dedicated Expo screens now cover home, auth, public discovery/directories, account/profile, money actions, legal/support, metadata, and billing shell routes.
- The deep-scan generic-shell gaps are now closed: MyCashback sign-in, Firebase auth callback, PDPA age verification, GoGoPass membership/pricing/billing, profile offers, phone/OTP routes, and `/profile/my-rating` redirect have dedicated Expo behavior.
- Desktop parity now includes header/category nav, cookie banner, GoGoLink banner, footer, login/register phone and OTP contract, web metadata, sitemap, and production app-link/env contracts.
- The 2026-05-27 cosmetic pass tightened Expo-vs-Next login mobile geometry, converted the auth social grid to the Next two-column mobile layout, shared the cookie banner across home/auth/privacy, moved the LINE FAB into a shared public-shell component, and aligned `/privacy-policy` with the Next public desktop/mobile shell instead of the old blue legal surface.
- The 2026-05-27 protected-state pass added a shared Expo route-state surface for startup loading, guarded route checks, unauthenticated redirects, offline retry, production fixture blocking, and auth callback missing/error/success states. This also fixed the Expo Router `Link asChild` callback crash and removed the new route-state console warnings.
- The 2026-05-27 account-resource pass added source-aware backend boundaries for profile, wallet, referral, profile offers, shop detail, and billing/subscription so backend mode shows loading, empty, error, offline, or disabled states instead of silently rendering stale fixtures.
- The selected `/link-mycashback` intro screen now matches the Next.js reference: desktop header/nav, light-blue sign-in band, connector assets, exact copy, Skip / Link Account CTAs, and desktop footer.
- The selected desktop language/region flow now matches the Next.js header popover contract on Expo: globe trigger, `Choose language and region` dialog semantics, English/Thai language rows, Thailand-first region list, selected states, and popover layering above the category nav.
- The desktop language/region control now also matches the Next.js motion contract: the globe scales on open, the popover fades/slides in over the shared base duration, and close runs a reverse animation before unmounting without browser warnings.
- The selected desktop `Sign in` header pill now uses the same 160x48 vector graphic contract as Next.js instead of live Expo text, removing the font/weight drift on the unauthenticated desktop header.
- Desktop route chrome now guarantees the shared navbar/category nav for root-covered desktop routes, and shared footer coverage is wired into self-owned public pages plus the discovery, shop/category detail, account, money, subscription, GoGoSense, GoGoLink, and route-state shells.
- Mobile parity now covers home carousels, Top/Trending/Travel/Makeup rails, search popover, GoGoLink sheet/dialog/result states, wallet, quest, profile, referral, missing orders, privacy center, privacy policy, favorite brands, shop detail, category detail, product discovery, brand directory, shops directory, and typography.
- GoGoSense now has dedicated Expo frontend flows for hub, onboarding, permissions, timeline, settings, recovery, and merchant detail instead of generic placeholder routes.
- RN Web account image warnings from wallet/quest are removed by passing `resizeMode` as an `Image` prop.

Verification run for this update:

- 2026-05-28 GitHub handoff: branch `expo-module` tracks `origin/expo-module` at commit `e605c59`; the old remote branch `codex/expo-desktop-navbar-footer` was deleted. This was a repository/docs handoff step, so no new runtime gate was run after the previously recorded green checks.
- `npm run mobile:test:flows`: passed, 9 tests.
- `npm run mobile:test:full`: passed, 30 files / 204 tests / 10 todo, typecheck, and Expo web export.
- `MOBILE_PLAYWRIGHT_NO_SERVER=1 npm run mobile:design-qa`: passed, 77 tests / 3 skipped across desktop and iPhone projects.
- `npm run validate`: passed lint, format check, i18n parity, and 53 root test files / 259 tests.
- 2026-05-27 cosmetic gates: `npm run test` passed 32 files / 223 tests with 7 todo, focused lint passed for touched files, `npm run typecheck` passed, Expo web export passed, and the desktop/mobile screenshot matrix for home/login/privacy/public route samples had no actionable console logs.
- 2026-05-27 protected-state gates: RED route-state parity tests now pass, `npm run test:full` passed 33 files / 226 tests with 7 todo, typecheck, and Expo web export; Playwright live smoke on `/profile` online redirect, `/profile` offline retry, and `/auth/callback` missing-link state captured no console warnings/errors.
- 2026-05-27 account-resource gates: RED account-resource parity tests now pass; focused tests and typecheck pass; backend-mode Expo web export proves `/wallet` calls `/withdraw/check` with the stored bearer token and renders error/offline retry states at mobile and desktop viewports; `npm run test:full` passed 34 files / 229 tests with 7 todo, typecheck, and Expo web export.
- 2026-05-27 locale-region gates: RED desktop locale parity coverage now passes, `npm run test:full` passed 34 files / 230 tests with 7 todo, typecheck, and Expo web export; Playwright live smoke on `http://127.0.0.1:19006/` confirmed the dialog content, top-section visibility, and zero captured console issues. Screenshot evidence: `/tmp/gogocash-locale-region-popover-desktop-fixed.png`.
- 2026-05-27 locale-motion gates: RED desktop locale motion coverage now passes, `npm run test:full` passed 34 files / 231 tests with 7 todo, typecheck, and Expo web export; Playwright live smoke on `http://127.0.0.1:19006/login` confirmed opening opacity/transform, final settled state, reverse close-before-unmount behavior, and zero captured console issues. Screenshot evidence: `/tmp/gogocash-locale-motion-login-open.png`.
- 2026-05-27 sign-in header graphic gates: RED desktop sign-in vector parity coverage now passes, `npm run test:full` passed 34 files / 231 tests with 7 todo, typecheck, and Expo web export; Playwright live smoke on `http://127.0.0.1:19006/` confirmed one SVG inside the 160x48 Sign in link, no rendered text node, and zero captured console issues. Screenshot evidence: `/tmp/gogocash-signin-nav-graphic-expo.png`.
- 2026-05-27 desktop route chrome gates: RED desktop shell coverage now passes, `npm run test:full` passed 35 files / 232 tests with 7 todo, typecheck, and Expo web export; Browser smoke on `http://localhost:19006/brand`, `/login`, and `/privacy-policy` confirmed one desktop navbar/footer contract per page with no captured console issues. Screenshot evidence: `/tmp/gogocash-desktop-chrome-brand-top.png`, `/tmp/gogocash-desktop-chrome-brand-footer.png`, `/tmp/gogocash-desktop-chrome-login-footer.png`, `/tmp/gogocash-desktop-chrome-privacy-adjusted.png`.
- Live browser smoke passed for `/gogosense` -> `Start setup` -> `/gogosense/onboarding`, and a fresh `/profile` check confirmed the Invite Friends row renders without current actionable console errors.
- Follow-up 39-route matrix against `http://localhost:3000/en` and `http://localhost:19006` passed on the Expo side: 39 / 39 routes returned content without overlays or actionable console issues. Screenshot evidence for the changed follow-up routes was saved under `/tmp/gogocash-followup-evidence`.
- The same matrix found a reference-server issue on every Next route: `/_next/static/chunks/src_features_10.enuq._.js` returns 404 on `localhost:3000`; protected Next routes also redirect to `/en/login?callbackUrl=...` when unauthenticated.
- Protected-route visual parity still needs an authenticated clean Next reference session; unauthenticated Next `/profile`, `/wallet`, `/referral`, and `/link-mycashback` captures may show the login surface while Expo can render seeded customer screens.

Not verified in this update:

- New runtime validation after the 2026-05-28 docs-only progress refresh.
- Full side-by-side screenshot comparison for every route against a clean Next.js reference server
- EAS preview/production builds
- iOS simulator, Android emulator, or physical-device smoke

Verified in the latest local completion pass:

- `npm run lint`
- `npm run test:full` with 229 passed tests / 7 todo, typecheck, and Expo web export
- `MOBILE_PLAYWRIGHT_NO_SERVER=1 npm run mobile:design-qa` with 77 passed checks / 3 desktop-only mobile skips

Current blockers before production launch:

- Map authenticated backend success payloads into the profile, wallet, referral, merchant, offer, and billing UI models where production requires live account data.
- Backend/device proof remains for protected native routes and logout, but local route guard behavior, Expo web session fallback, logout confirmation, and session clear UX are implemented.
- Route-specific backend loading, empty, error, offline, and disabled gates are wired for the six priority fixture-backed account routes; remaining proof is live authenticated success payload coverage against the real API.
- Confirm Firebase public config ownership and production analytics/crash-reporting projects.
- Complete screenshot evidence, device QA, EAS build smoke, App Store privacy answers, and Google Play data-safety checklist.

## Epic 1: Native App Foundation

User story: As a GoGoCash customer, I can install a native iOS or Android app that uses the same app identity, staging backend, and navigation model as the web app.

Tasks:

- [x] Create independent Expo app in `apps/mobile`.
- [x] Configure Expo Router, TypeScript, SecureStore, React Query, Sentry, PostHog, icons, splash, and EAS profiles.
- [x] Add staging env defaults for API, app env, and frontend URL.
- [x] Configure iOS bundle ID `co.gogocash.app`, Android package `co.gogocash.app`, and URL scheme `gogocash`.
- [x] Add route files for the current customer web route catalog.

Acceptance criteria:

- `npm run mobile:test` passes.
- `npm run mobile:typecheck` passes.
- `expo config --type public` shows app name `GoGoCash`, scheme `gogocash`, iOS bundle ID `co.gogocash.app`, Android package `co.gogocash.app`, and staging API URL.

## Epic 2: Web Design System Parity

User story: As a GoGoCash customer, the native app visually feels like the web mobile UI, including mint accents, white cards, rounded navigation, spacing, and shell behavior.

Tasks:

- [x] Capture typed mobile design tokens from the current web UI.
- [x] Center the app shell at web mobile width on large browser previews.
- [x] Keep search, content, shortcuts, cards, and bottom nav capped at the same mobile width.
- [x] Replace stretched browse shortcuts with compact fixed-height controls.
- [x] Port real web iconography to native vector icons instead of placeholder glyphs.
- [ ] Add screenshot comparison coverage for home/profile at mobile and wide desktop preview widths.

Acceptance criteria:

- Wide browser preview does not stretch customer UI beyond the mobile frame.
- No placeholder route-contract UI appears on migrated native screens.
- Design parity tests cover tokens, shell sizes, shortcut order, and bottom nav.

## Epic 3: Profile Hub Parity

User story: As an authenticated GoGoCash customer, I can open Profile and see the same wallet summary, profile submenu, account actions, legal links, support links, and logout entry as the web mobile profile hub.

Tasks:

- [x] Replace the generic native profile placeholder with a real profile hub.
- [x] Add wallet summary card, profile title, profile submenu, menu rows, external legal/support rows, and logout row.
- [x] Match web profile menu order, including Terms of Use and Terms of Service.
- [x] Make external legal/support rows real links.
- [x] Bind profile wallet summary and user identity to the secure native session, with staging fixture fallback.
- [x] Add native logout confirmation dialog and session clear behavior.
- [x] Add protected-route redirect behavior for profile subroutes and every `requiresAuth` route.

Acceptance criteria:

- `/profile` shows Profile, Total Cashback Available, Withdraw, Personal Information, Credit Score, Withdraw Methods, Account Setting, all web profile menu rows, and Log Out.
- `/profile` does not show "Screen contract", "Related web screens", or other placeholder migration text.
- Terms of Use, Terms of Service, Help Center, and Connect with GoGoCash expose link roles and correct hrefs on web preview.

## Epic 4: Native Screen Migration

User story: As a GoGoCash customer, every customer web route has a native screen or native-safe equivalent with matching layout, content, and state behavior.

Tasks:

- [x] Home and discovery feed: banners, GoLink banner, extra modules, trending, categories, offer cards.
- [x] Brands, shops, shop detail, categories, and category detail.
- [x] Login, register, auth callback, and account setup.
- [x] MyCashback link and MyCashback sign-in.
- [x] GoGoSense hub, onboarding, permissions, timeline, settings, recovery, and merchant detail.
- [x] Quest, GoLink, wallet, withdraw, and payment methods.
- [x] Favorites, referral, billing/subscription/pricing/membership, credit score, missing orders, language, privacy center, privacy policy, and history.
- [x] Dynamic route parameters for shop, category, and GoGoSense merchant routes are normalized before reaching screens.
- [x] Shared app-level loading, error, offline, unauthenticated, and callback state surface for route guards and startup.
- [x] Route-specific loading, empty, error, offline, and disabled states for the six priority fixture-backed account flows: profile, wallet, referral, profile offers, shop detail, and billing/subscription.
- [ ] Live backend success-payload mapping for account/profile data models where production should render real API data instead of local fixture-shaped view models.

Acceptance criteria:

- Each migrated route has behavior tests before native implementation.
- Route-specific placeholder contract cards are removed as each real screen lands.
- Mobile preview and device smoke checks confirm no text overlap or stretched desktop layout.

## Epic 5: API, Auth, Observability, And Release Readiness

User story: As a GoGoCash operator, I can launch the app to stores with secure sessions, native deep links, analytics, crash reporting, and privacy metadata.

Tasks:

- [x] Add fetch-based API client and secure session storage tests.
- [x] Clear secure session on `401`.
- [x] Add app config placeholders for Sentry and PostHog public env.
- [ ] Add Firebase public config once app ownership is confirmed.
- [x] Add full deep-link tests for `gogocash://login`, `gogocash://auth/callback`, `gogocash://shop/:id`, `gogocash://quest`, `gogocash://profile`, `gogocash://wallet`, and `gogocash://withdraw`.
- [ ] Add Maestro device E2E for first launch, locale switch, home, shop detail, auth, profile, wallet, withdrawal method flow, deep links, offline error, and logout.
- [ ] Run EAS preview and production build smoke checks.
- [ ] Complete App Store privacy and Google Play data-safety checklist.

Acceptance criteria:

- No secrets are committed.
- Staging is the default mobile backend until an explicit production switch is approved.
- Sentry and PostHog smoke events work before store submission.
