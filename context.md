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

## Remaining work — 1 functional-parity feature: Quest History view
`/quest/history` (`<CustomerQuestScreen history />`) currently only flips the active tab + title; no dedicated history content. Web `GogoquestHistory.tsx` (690 lines) has a hero/plan card, current-campaign score card, monthly points list, rewards list (NEW badges), month-picker leaderboard + player dialog.
- Minimal-parity slice to build: hero/plan card + current-campaign card + monthly list (empty state) + rewards list (empty state). Skip the month-picker + player dialog.
- Implement as EDITS to `CustomerQuestScreen.tsx` (add a `QuestHistoryView` sub-component in-file + a `webQuestHistory` fixture) and branch the render on `history` so it is NOT orphaned. Do NOT add a new file (a prior attempt created an orphaned new file tsc silently skipped while broken).
- Re-read `gogocash_app-staging/src/features/quest/component/GogoquestHistory.tsx` + `src/messages/en.json` for EXACT copy — do not reconstruct it.

## Quest-tasks note
A draft to add daily-reward + social-missions + invite blocks to the quest Tasks tab was scoped but its fixture copy was reconstructed, not verified — NOT committed. If picked up, re-extract exact labels from `gogocash_app-staging/src/features/quest/component/ListShop.tsx` + `common/SocailList.tsx` first.
