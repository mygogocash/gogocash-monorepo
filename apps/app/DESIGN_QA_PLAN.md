# GoGoCash Mobile Design QA Plan

This QA plan verifies that the native Expo app matches the current customer web app design while remaining a real native implementation, not a WebView.

## QA Goal

Confirm each mobile screen aligns with the web app in layout, visual tokens, navigation, content hierarchy, interaction states, loading/error states, and responsive behavior.

The web app is the source of truth until a newer approved Figma or product spec replaces it.

## Scope

In scope:

- Native Expo screens under `apps/mobile`.
- Customer web reference routes under `src/app/[locale]`.
- Shared visual decisions captured in `apps/mobile/src/design/webDesignParity.ts` and `apps/mobile/src/theme/tokens.ts`.
- iOS simulator, Android emulator, and Expo web preview.
- English and Thai copy where the web route supports both.

Out of scope for design QA:

- Backend correctness beyond data shape needed to render states.
- Store listing assets, App Store review metadata, and privacy/data-safety forms.
- Pixel-perfect parity for platform-native font rendering differences, unless spacing or hierarchy breaks.

## Source Of Truth

Use these references for every migrated route:

- Web route UI: `src/app/[locale]/**`
- Web feature components: `src/features/**`
- Web shared shell: `src/components/layouts/**`
- Web mobile nav/search/menu constants: `src/constants/**`
- Native route catalog: `apps/mobile/src/navigation/routes.ts`
- Native parity constants: `apps/mobile/src/design/webDesignParity.ts`
- Native tokens: `apps/mobile/src/theme/tokens.ts`
- Mobile build plan: `apps/mobile/FRONTEND_PARITY_PLAN.md`

## Required Viewports And Devices

Web baseline screenshots:

- iPhone SE size: `375 x 667`
- Standard iPhone size: `390 x 844`
- Large iPhone size: `430 x 932`
- Tablet/narrow desktop preview: `768 x 1024`
- Wide desktop preview: `2048 x 1005`

Native QA targets:

- Expo web preview at the same viewport sizes.
- iOS simulator: current supported iPhone small and large.
- Android emulator: current supported Pixel small and large.
- Real device smoke before release when available.

## Route QA Matrix

For every row, capture web baseline, native screenshot, compare, record result, and link issues.

| Priority | Route Group   | Web Routes                                                           | Native Routes | Required States                                             |
| -------- | ------------- | -------------------------------------------------------------------- | ------------- | ----------------------------------------------------------- |
| P0       | Shell         | `/`, `/profile`, `/wallet`, `/quest`, `/golink`                      | tabs          | search, shortcuts, bottom nav, safe area, active nav        |
| P0       | Profile hub   | `/profile`                                                           | `/profile`    | signed-in, signed-out redirect, backend loading/empty/error/offline, legal/support links, logout |
| P0       | Auth          | `/login`, `/register`, `/auth/callback`, `/account-setup`            | same          | empty, validation errors, loading, missing callback, provider handoff |
| P0       | Wallet        | `/wallet`, `/withdraw`, `/method`                                    | same          | empty wallet, balance, backend loading/empty/error/offline, method list |
| P0       | Shops         | `/shops`, `/shop/[id]`, `/brand`                                     | same          | list, detail, favorite, tracking CTA, missing image, backend detail error |
| P1       | Discovery     | `/`, `/discover`, `/category`, `/category/[name]`                    | same          | loading, empty, filters, cards, policy sections             |
| P1       | Quest         | `/quest`, `/quest/history`                                           | same          | available quest, history empty, history list                |
| P1       | Cashback link | `/golink`, `/link-mycashback`                                        | same          | form, result, error, external handoff                       |
| P1       | Account       | `/profile/info`, `/credit-score`, `/language`                        | same          | profile fields, locale, read-only/error                     |
| P2       | Support/legal | `/privacy-center`, `/privacy-policy`, `/missing-orders`, `/referral` | same          | content, forms, external links, referral backend states     |
| P2       | Membership    | `/membership`, `/subscription`, `/pricing`, `/billing`               | same          | plan visibility, billing unavailable, backend error/offline, checkout disabled |

## Design Checklist

Run this checklist per route.

- [ ] Web baseline screenshot captured with route, viewport, locale, and mock/live mode noted.
- [ ] Native screenshot captured from Expo web and at least one simulator/emulator.
- [ ] Layout width matches web mobile shell and does not stretch on wide desktop preview.
- [ ] Safe areas, sticky search/header, scroll padding, and bottom nav clearance match web behavior.
- [ ] Colors match token values: background, card, primary mint, primary soft, text, muted, border.
- [ ] Border radius and shadow match the web card/nav pattern.
- [ ] Typography hierarchy matches: page title, section title, body text, caption, button text.
- [ ] Spacing rhythm matches web: section gaps, card padding, row heights, chip spacing.
- [ ] Icons are equivalent to web intent and size, preferably native vector icons.
- [ ] Images/logos use the same source priority, fallback shape, aspect ratio, and crop behavior.
- [ ] Content order matches the web route.
- [ ] Buttons, links, tabs, segmented controls, toggles, inputs, and menus expose expected hit areas.
- [ ] Active, pressed, disabled, loading, empty, and error states are visually covered.
- [ ] Text fits in English and Thai without overlap, clipping, or unreadable truncation.
- [ ] External links show the same destinations as web.
- [ ] Auth-required routes handle unauthenticated and offline states consistently with web expectations.
- [ ] No route-contract placeholder text remains on migrated screens.
- [ ] No console errors, React Native Web warnings, or simulator red screens.

## Screenshot Comparison Rules

Use screenshot comparison as a signal, not the only sign-off gate.

Hard fail:

- Missing primary content or wrong screen.
- Stretched desktop-width layout in mobile app preview.
- Broken safe area or bottom nav overlap.
- Missing CTA, missing legal link, or wrong route destination.
- Text overlap, clipped controls, or unreadable contrast.
- Placeholder migration UI on a migrated screen.

Investigate:

- More than `3%` visual diff on a full-screen screenshot.
- More than `1%` diff in stable shell regions: search, bottom nav, profile menu rows.
- Font rendering differences that change hierarchy or wrapping.
- Image crop differences that hide product/brand information.

Allowed variance:

- Minor native font rasterization differences.
- Platform status bar and home indicator differences.
- Small shadow/rendering differences that do not change hierarchy.

## Manual QA Flow

1. Start web and mobile targets.
2. Open the matching web route and native route.
3. Capture screenshots for all required viewports.
4. Compare against the design checklist.
5. Test primary interactions and back navigation.
6. Switch locale to Thai where supported.
7. Test unauthenticated/authenticated expectations.
8. Record result as Pass, Pass With Notes, or Fail.
9. File a bug for every Fail with screenshots, route, viewport, platform, and expected web reference.

## Automation Plan

Unit and contract tests:

- `apps/mobile/src/__tests__/web-design-parity.test.ts`
- `apps/mobile/src/__tests__/account-resource-state-parity.test.ts`
- Token parity, route order, profile menu order, bottom nav order, shell width.
- Account-resource endpoint ownership and backend-mode loading/empty/error/offline wiring.

Web preview visual smoke:

- Use Playwright against Expo web at `http://localhost:8081`.
- Run `MOBILE_PLAYWRIGHT_NO_SERVER=1 npm run mobile:design-qa` when the Expo dev server is already running.
- Run `npm run mobile:design-qa` to let Playwright start or reuse the Expo web server.
- Assert migrated routes do not contain placeholder copy.
- Assert shell max visible content width is `448px` on wide desktop preview.
- Assert legal/support rows expose link roles and correct hrefs.
- Capture screenshots for artifacts.

Device E2E:

- Use Maestro for iOS simulator and Android emulator.
- Cover first launch, home, profile, wallet, shop detail, deep link, offline error, and logout.

Future visual regression:

- Add Playwright screenshot baselines for web reference and native Expo web.
- Add a comparison script using stable masks for platform-only chrome.
- Store approved baselines per route, locale, viewport, and theme.

## Bug Template

Title:

`[Mobile Design Parity] <route> <viewport/platform> <issue>`

Required fields:

- Web route:
- Native route:
- Platform:
- Viewport/device:
- Locale:
- Data mode:
- Expected web reference:
- Actual native result:
- Screenshots:
- Severity:
- Repro steps:

Severity:

- P0: blocks core journey or hides primary content.
- P1: visible mismatch in core UI, CTA, nav, or layout.
- P2: secondary state mismatch or minor copy/icon/spacing issue.
- P3: polish only.

## Sign-Off Criteria

A route is design aligned when:

- All checklist items pass or have approved notes.
- No P0 or P1 design bugs remain.
- Automated parity tests pass.
- Browser/simulator smoke has no console errors, warnings requiring action, or red screens.
- Product/design approves screenshots for English and Thai where applicable.

Release design QA is complete when:

- All P0 route groups pass.
- All app shell checks pass on iOS, Android, and Expo web.
- `npm run validate`, `npm run mobile:test`, and `npm run mobile:typecheck` pass.
- EAS preview builds install and pass smoke checks on both platforms.
