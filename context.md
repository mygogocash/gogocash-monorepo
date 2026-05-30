# GoGoCash Expo Migration — Live Context

_Last updated: 2026-05-30. Branch `expo-module`._

What's done / what's left in the Next.js → Expo visual-parity pass for `apps/mobile`. See `agent.md` for workflow, `design.md` for the design system, `project.md` for the repo map.

## Scope
Visual/structural parity with the frozen Next.js reference (`gogocash_app-staging`). Out of scope: auth, API/live data, i18n, analytics, web3, Stripe. Audit caveat: the gap audit had a **~50% false-positive rate** — always ground-truth against BOTH the real web file and the real Expo file before fixing.

## Shipped — pushed to `origin/expo-module` (HEAD 8d3ba17)
1. Referral invitation table — 4th "Status" column + green Success pill (#E6F7ED / #00B14F, radius 30).
2. Bottom-nav — emphasized Wallet button 72→64px + lift −22→−32; profile avatar 34→28.
3. Category grid — added missing 5-column tier for lg widths 1024–1279 (web 2/3/4/5/6).
4. Quest leaderboard — "My Rank" card (#F1FFFC, #00CC99 border, 2 columns + View Points breakdown).
5. Verify-Phone heading color #00AA80 → #00B14F.

## Shipped — LOCAL ONLY, NOT pushed (held back per "don't deploy yet")
Local HEAD is **3 commits ahead** of `origin/expo-module`:
6. `82d1fc5` Footer column grid responsive — `getDesktopFooterGrid(viewportWidth)` + flexWrap/gap/flexBasis (cols 3→2→1, gap 64→32).
7. `9af1748` Inactive desktop subnav tabs — hover-underline (`DesktopCategoryTab`, onHoverIn/Out, opacity active?1:hovered?0.4:0).
8. `723b223` Membership — #savings proof card ("Annual saves you real money", ฿588 vs ฿490, "You save ฿98 (~16%)") + #social-proof 3-stat row (220+/16%/฿49). Copy verbatim from web en.json.

All verified RED→GREEN, tsc 0, full suite green (**243 passed / 0 failed / 7 todo** at local HEAD).
To deploy these 3 once signed off: `git push origin expo-module`.

## Confirmed FALSE POSITIVES (no change — Expo already matched web)
- Wallet empty-title color (already #00AA80) · Wallet table chrome (web shows only NoDataWallet at 0 rows) · Category PolicyBanner/PolicyTerms (web data map empty + flag off) · Discovery grid columns (already 2/3/4/5).

## Remaining work — 1 feature: Quest History view
`/quest/history` (`<CustomerQuestScreen history />`) currently only flips the active tab + title; no dedicated history content. Web `GogoquestHistory.tsx` (690 lines) has a hero/plan card, current-campaign score card, monthly points list, rewards list (NEW badges), month-picker leaderboard + player dialog.
- Minimal-parity slice to build: hero/plan card + current-campaign card + monthly list (empty state) + rewards list (empty state). Skip the month-picker + player dialog.
- Implement as EDITS to `CustomerQuestScreen.tsx` (add a `QuestHistoryView` sub-component in-file + a `webQuestHistory` fixture) and branch the render on `history` so it is NOT orphaned. Do NOT add a new file (a prior attempt created an orphaned new file tsc silently skipped while broken).
- Re-read `gogocash_app-staging/src/features/quest/component/GogoquestHistory.tsx` + `src/messages/en.json` for EXACT copy — do not reconstruct it.

After Quest History, the in-scope visual-parity pass is complete; live-data/auth phases are separate and parked.

## Quest-tasks note
A draft to add daily-reward + social-missions + invite blocks to the quest Tasks tab was scoped but its fixture copy was reconstructed, not verified, and the apply attempts were lost to environment issues — NOT committed. If picked up, re-extract exact labels from `gogocash_app-staging/src/features/quest/component/ListShop.tsx` + `common/SocailList.tsx` first.
