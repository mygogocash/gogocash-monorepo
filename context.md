# GoGoCash Expo Migration — Live Context

_Last updated: 2026-05-31. Branch `expo-module` (pushed to origin, synced). Last feature commit `d1360f8` (analytics slice 1); this doc-commit is HEAD itself — run `git rev-parse --short HEAD` for the exact tip rather than trusting a pinned SHA (see the ghost-SHA history below)._

What's done / what's left in the Next.js → Expo migration for `apps/mobile`. See `agent.md` for workflow, `design.md` for the design system, `project.md` for the repo map.

## Scope
Visual/structural parity with the frozen Next.js reference (`gogocash_app-staging`). i18n, web3, and Stripe checkout remain parked (verified genuinely absent). Audit caveat: the gap audit had a **~50% false-positive rate** — always ground-truth against BOTH the real web file and the real Expo file before fixing.

## BACKLOG TRUTH (adversarially deep-verified 2026-05-31 — supersedes the old "parked" framing)
A workflow verified every "parked by design" claim against real code. The old blanket "live-data, auth, i18n, analytics, web3, Stripe all parked" was WRONG for 3 of 6 — they understated shipped work. See memory `gogocash-expo-backlog-deepverify`. Corrected status:
- **auth = partially-wired** (NOT parked): session store + route guard + OAuth callback all RUN; only the login FORM is fake (hardcoded OTP `123456`). Finish-the-wiring.
- **live-data = partially-wired** (NOT parked): 6 account screens wire `useQuery` to real endpoints, dormant because `accountDataSource='fixtures'`. Home+Discovery truly fixture-only.
- **analytics = infra fully-wired**; SLICE 1 DONE (a91c601): `src/analytics/events.ts` event vocabulary mirrors web GA4/PostHog names exactly (page_view, merchant_category_select, select_promotion, quest_started, cashback_withdraw_success, complete_registration + identify/reset, platform:"mobile"). 12 tests. SLICE 2 PENDING: per-screen wiring (useAnalytics() hook bridging usePostHog() + .capture() in Banner/MissionList/withdraw/login). view_item/select_item/add_to_wishlist deferred (need parked merchant/offer model).
- **Stripe / web3 / i18n = correctly parked** (no deps even installed; `src/web3` does not exist).
- **HIDDEN pending (not previously tracked):** GoGoSense detector is a permanent no-op stub behind a full 8-route surface; credit-score renders fabricated numbers as real (`my-rating` is a bare redirect); `NativeParityScreen.tsx` (1615 lines) is dead/unrouted; control docs drift (agent.md 243/7 stale vs real 264/0; project.md repo map omits ~14 of 21 src dirs).

## State: everything below is committed AND pushed to `origin/expo-module` (last feature commit d1360f8)
Source suite **264 passed / 0 failed / 0 todo** (38 files, `npm test`) — was 252, +12 from the analytics event vocabulary. Render suite **5 passed** (`npm run test:render`). tsc **0 errors** (verify tsc separately — source-string parity tests do not compile components, so the suite can be green while tsc is red; a StyleSheet.absoluteFillObject TS2551 slipped through once and was fixed in 6de020e). NOTE: bash stdout/exit-codes were corrupted this session (rtk) — counts here were confirmed via the Read tool on raw vitest result files + JSON reporter, not bash echo.

Render-test harness (`npm run test:render`, audit #2 first slice): **5 passed / 0 failed** — actually mounts `CustomerRouteState` in happy-dom (`react-native`→`react-native-web`). Separate `vitest.render.config.ts` + `*.render.test.tsx` glob; `src/test-support/` stubs for phosphor-react-native, expo-router, static assets, and CustomerDesktopFooterSlot (the footer's line-16 value-position `typeof` type alias breaks the rolldown/oxc transform — stubbed, NOT changed in source). Render test bodies use the variant union via a type-only import; deeper TS in test bodies can still trip the transform. NOTE: the harness was committed broken first (false "5 passed" claims in earlier commits) and only genuinely passes as of **e53236c**. See memory `gogocash-expo-render-test-harness`.

Visual-parity fixes:
1. Referral invitation table — 4th "Status" column + green Success pill (#E6F7ED / #00B14F, radius 30).
2. Bottom-nav — emphasized Wallet button 72→64px + lift −22→−32; profile avatar 34→28.
3. Category grid — added missing 5-column tier for lg widths 1024–1279 (web 2/3/4/5/6).
4. Quest leaderboard — "My Rank" card (#F1FFFC, #00CC99 border, 2 columns + View Points breakdown).
5. Verify-Phone heading color #00AA80 → #00B14F.
6. Footer column grid responsive — `getDesktopFooterGrid(viewportWidth)` + flexWrap/gap/flexBasis (cols 3→2→1, gap 64→32).
7. Inactive desktop subnav tabs — hover-underline (`DesktopCategoryTab`, onHoverIn/Out, opacity active?1:hovered?0.4:0).
8. Membership — #savings proof card ("Annual saves you real money", ฿588 vs ฿490, "You save ฿98 (~16%)") + #social-proof 3-stat row (220+/16%/฿49). Copy verbatim from web en.json.

Security suite — all 7 `it.todo` placeholders resolved into real tests (security-pentest.test.ts now 22 pass / 0 todo):
9. 4 client-contract tests over already-correct code: auth-callback replay (router.replace + code exchange), account IDOR (session-bound endpoints, no caller id), billing tampering (no client price/customer fields), GoGoSense screenshot (authenticated api client, no raw fetch).
10. 2 new real client modules: `src/withdraw/api.ts` (`createWithdrawApi.submitWithdrawal` requires + sends an `Idempotency-Key` header on POST /withdraw/submit) and `src/pdpa/api.ts` (`createPdpaApi.requestDataExport` session-bound, locale-only, no userId/accountId).
11. Device-lifecycle privacy: `src/security/PrivacyScreenGuard.tsx` (pure RN `AppState` overlay — covers the UI when state !== "active", i.e. iOS app switcher / backgrounded / crash-relaunch), wired into `AppProviders`. NOTE: `expo-screen-capture` install **timed out in this environment** (no network); the AppState overlay is the dependency-free implementation. To also get Android FLAG_SECURE / iOS recording prevention, install `expo-screen-capture` in a clean env and add `preventScreenCaptureAsync` to the guard.

## Confirmed FALSE POSITIVES (no change — Expo already matched web)
Wallet empty-title color (already #00AA80) · Wallet table chrome (web shows only NoDataWallet at 0 rows) · Category PolicyBanner/PolicyTerms (web data map empty + flag off) · Discovery grid columns (already 2/3/4/5).

## Quest History view — DONE (d4c8693, 2026-05-31)
Built the minimal-parity slice as an in-file `QuestHistoryView` in `CustomerQuestScreen.tsx`, branched via `if (history)` (the non-history tabs/leaderboard path is untouched, preserving the frontend-user-flow landmark `history ? "leaderboard" : "how-to-win"`). Sections: hero + plan card (kicker/title/intro/3 numbered steps/Quest+Stores CTAs), "This round" campaign card (period label + pending state, your-score sign-in hint + footnote), monthly section (empty state), rewards section (empty state). Copy is the EXACT web `gogoquestHistory*` next-intl English values (web uses 55 FLAT `gogoquestHistory*` keys, NOT nested `quest.history.*`), stored in a new `webQuestHistory` fixture in `webDesignParity.ts` and asserted byte-for-byte by `quest-history-parity.test.ts` (2 tests, TDD RED→GREEN).
- Web source: `gogocash_app-staging/src/features/quest/component/GogoquestHistory.tsx` (691) + `GogoquestHistoryInsightSection.tsx` (76) + `QuestHistoryNavLink.tsx` (88).
- STILL PARKED (live-data phase, not built): real campaign dates / day-left countdown / round-ended state, actual monthly bars, real rewards list with NEW badges, the month-picker leaderboard, and the player-summary dialog. The insight section was also skipped. These are deliberately out of the visual-parity slice.

## Quest-tasks note
A draft to add daily-reward + social-missions + invite blocks to the quest Tasks tab was scoped but its fixture copy was reconstructed, not verified — NOT committed. If picked up, re-extract exact labels from `gogocash_app-staging/src/features/quest/component/ListShop.tsx` + `common/SocailList.tsx` first.
