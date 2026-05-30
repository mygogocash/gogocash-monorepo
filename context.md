# GoGoCash Expo Migration — Live Context

_Last updated: 2026-05-31. Branch `expo-module`, HEAD `8d119f9` (pushed to origin, synced)._

What's done / what's left in the Next.js → Expo migration for `apps/mobile`. See `agent.md` for workflow, `design.md` for the design system, `project.md` for the repo map.

## Scope
Visual/structural parity with the frozen Next.js reference (`gogocash_app-staging`). Live-data wiring, auth, i18n, analytics, web3, and Stripe checkout remain parked. Audit caveat: the gap audit had a **~50% false-positive rate** — always ground-truth against BOTH the real web file and the real Expo file before fixing.

## State: everything below is committed AND pushed to `origin/expo-module` (HEAD 8d119f9)
Full suite **250 passed / 0 failed / 0 todo**, tsc **0 errors** (verify tsc separately — source-string parity tests do not compile components, so the suite can be green while tsc is red; a StyleSheet.absoluteFillObject TS2551 slipped through once and was fixed in 6de020e).

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

## Quest History view — CORRECTION (2026-05-31): it is BUILT, not remaining work
The prior "remaining functional-parity feature: Quest History view" claim in this file was FALSE (verified by reading the code 2026-05-31). The view IS implemented:
- `apps/mobile/src/quest/GogoQuestHistoryView.tsx` (636 lines) — a full typed content model covering season, rewards + rewardItems (with empty state), monthly + monthlyEntries, leaderboard + leaderboardEntries, plus optional insight and playerSummary. This is MORE than the "minimal slice" the old note proposed.
- Wired into `CustomerQuestScreen.tsx` (imports `GogoQuestHistoryView` + `GogoQuestHistoryContent`, renders it when the `history` prop is true; default `history = false`).
- Web source of truth: `gogocash_app-staging/src/features/quest/component/GogoquestHistory.tsx` (691 lines) + `GogoquestHistoryInsightSection.tsx` (76) + `QuestHistoryNavLink.tsx` (88); copy in `src/messages/en.json` under `quest.history.*` (53 keys).

REAL remaining gap on this feature: **ZERO parity test coverage.** No `src/__tests__/*` references `GogoQuestHistory` or reads `quest/GogoQuestHistoryView`. So parity vs the web `GogoquestHistory.tsx` is UNVERIFIED. Next step is a parity test (source-string pattern: read the view file, assert it contains the web `quest.history.*` English copy + the section structure), which both closes the coverage gap and reveals any real divergence. Do not assume parity until that test is green.

## Quest-tasks note
A draft to add daily-reward + social-missions + invite blocks to the quest Tasks tab was scoped but its fixture copy was reconstructed, not verified — NOT committed. If picked up, re-extract exact labels from `gogocash_app-staging/src/features/quest/component/ListShop.tsx` + `common/SocailList.tsx` first.
