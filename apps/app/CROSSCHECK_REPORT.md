# GoGoCash Expo ↔ Next.js Cross-Check Report

> Generated 2026-05-30 against the **frozen Next.js reference** (`gogocash_app-feature-login-firebase` @ commit `41054d7`).
> Two adversarially-verified workflows: (1) page + user-flow parity, (2) icon + desktop/mobile responsive parity.
> Every finding below was **re-read and confirmed** by a second verifier agent — the "refuted/false-positive" class
> from earlier passes is excluded. Where a finding is unverified, it is labelled so.
>
> **Post-report note (2026-06-22):** This report predates customer-app **dark mode** (`docs/dark-mode.md`).
> Light-theme visual findings remain valid for the web parity baseline; dark-appearance regressions are
> out of scope for this snapshot — use `DESIGN_QA_PLAN.md` § Dark mode QA instead.
>
> **Post-report note (2026-06-24):** Home desktop footer scroll + 2-row brand grids + **`Cashback upto`** copy
> landed after this snapshot — use `DESIGN_QA_PLAN.md` § Desktop home QA for the current contract.

## ⚠️ Coverage caveats (read first — this report is partial)

Several sub-agents completed without emitting structured output, so some route groups have **no verified data** and
are NOT covered here. Do not read "absence in this report" as "no gap."

| Workflow | Groups/flows run | Returned verified data | Failed (no structured output) |
|---|---|---|---|
| Page + flow | 15 pages + 9 flows | 8 page groups + 9 flows | 5 page groups (incl. credit-score, referral, favorite/PDPA, link-mycashback, quest pages) |
| Icon + responsive | 14 groups | 2 groups (shops/brand/detail, category/discover) + shell partial | 7 groups (home, golink, auth, profile, wallet, membership, etc.) |
| Synthesis | both | **empty** (agent returned no text) | rebuilt manually from verdicts below |

**Not covered by verified data (re-run needed):** home icon set, auth screen icons, profile/wallet/membership icons,
golink icons, and the page-level depth for credit-score, referral, favorite, link-mycashback, quest history.

## Verdict (from the data that did return)

- **Route coverage is complete** — every customer Next.js route has an Expo screen (confirmed in earlier inventory:
  41054d7 has 0 customer routes missing on Expo; only `/demo-top-brands-square` + `/sentry-example-page` are Next-only
  dev pages, and `/gogosense/*` is Expo-only by design).
- **Depth is the gap, not breadth.** Every verified page group is **fixture-backed**, not wired to the live API.
- **No user flow is fully completable on a real device today.** All 9 traced flows are `partial` except home-search
  (`mostly-works`). The blockers are consistent: mocked auth, no live data, native-incompatible web APIs
  (`navigator.clipboard`, `localStorage`, `window.FB`), and unwired Stripe/web3.

---

## A. Cross-cutting blockers (hit many screens — fix once)

These map directly to the migration-plan phases (0 primitives / 2 auth / 3 live-data / 5 web3 / 6 stripe).

| # | Blocker | Screens affected | Phase |
|---|---|---|---|
| X1 | `navigator.clipboard` used for copy → **no-op on native iOS/Android** | profile, profile/offer, referral, wallet, golink, shop-detail | 0 (expo-clipboard) |
| X2 | `localStorage` for missing-order claims / consent → **crashes on native** | wallet, missing-orders, privacy-center | 0 (AsyncStorage) |
| X3 | i18n hardcoded English; web uses next-intl (en/th) | every verified group | 1 (i18n) |
| X4 | Auth mocked: OTP hardcoded `123456`, no Firebase, no session creation | auth, profile phone, all `requiresAuth` flows | 2 (Firebase) |
| X5 | All data is fixtures (`webDesignParity.ts`), not react-query on the live API | every page group | 3 (live data) |
| X6 | Analytics absent: no trackMerchant*/Meta/PostHog/MerchantListTracker | home, shops, category, shop-detail | 3 |
| X7 | Stripe checkout/portal not wired; no deep-link return | membership, subscription, billing | 6 (Stripe) |
| X8 | On-chain web3 withdrawal absent | wallet, withdraw/method | 5 (web3) |

---

## B. Per-page confirmed gaps (verified groups only)

### Home + search — ✅ no high/critical gaps flagged
Cleanest surface. (Icon set unverified — see caveats.)

### Shops + Brand + Shop detail
- Directory data is fixtures (`getShopDirectoryResults`/`getBrandDirectoryResults`, client-side filter); web is live
  react-query on `/offer` + `/offer/get-category/list`, 320ms debounce, country dedupe, server pagination.
- **Shop detail uses ONE hardcoded fixture for every id** (`webShopDetailGroceryGalaxy` regardless of `shopId`);
  web fetches `/offer/{id}`.
- **Shop Now button has no `onPress`** — cannot generate deeplink / activate cashback on native.
- **Favorite is visual-only** (no `onPress`, heart statically filled); web mutates `favoriteOffer` + toast + refetch.
- **Coupon rail missing** — web has codes, copy, 1s live countdown, learn-more links; Expo shows only empty state.
- Share/referral card: Share button has no `onPress`; web uses `navigator.share`/clipboard.
- No auth gating (web blocks Shop Now for unauth → `/login?callbackUrl`, hides coupons without session).
- No analytics; no `?product=` anchor scroll or GoLink `?continue=1` auto-checkout.
- i18n hardcoded; `dedupeOffersByBrand` per-country visibility not applied.

### Category + Discover
- All 4 screens fixture-backed (mock-* data); not wired to `/offer`, `/offer/get-category/list`, `/policy/category/:id`.
- **Policy sections missing** — web `PolicyBannerSection` + `PolicyTermsSection` (flag-gated, collapsible terms) have
  no Expo equivalent.
- **No `app/discover.tsx` route** — discover variant reachable only as a routeId, not a real `/discover` route.
- i18n hardcoded; analytics (MerchantListTracker/trackMerchant*) absent; external Shop Now (`window.open`) not branched;
  search filters fixtures synchronously vs web's 320ms debounced refetch.

### Auth (login / register / callback / account-setup)
- **OTP hardcoded `123456`** — no `/auth/send-otp` / `verify-otp`; web uses Firebase phone auth.
- **No Firebase** — `handlePhoneSubmit` flips phase only; no `signIn('firebase')`, no session, no SecureStore write.
- 7 social provider buttons visual-only (no `onPress`); web wires Google/X/Facebook + Telegram OAuth.
- Country picker static (default TH, no list); web uses MUI Autocomplete over `/api/countries`.
- `auth/callback` `?token` deep-link handoff exists but not line-verified.

### Profile + account-settings
- Phone OTP screen Continue has no `onPress`; no Firebase send/confirm; no resend timer / country picker.
- Profile-info form local `useState` only — no `PUT /user/profile`, no toast, no session update.
- No avatar upload (web has File API + compression + `PUT avatar_url`).
- Offer list = 2 static fixture rows vs web MUI DataGrid (pagination + per-row copy).
- `navigator.clipboard` in copy handlers (X1).

### Wallet (transaction history)
- **No transaction-history screen** — web `/wallet` is a 1045-line grid (earn+withdraw+claim rows, status chips,
  date filter, copy); Expo `CustomerWalletScreen` is a summary-card screen only.
- Balance/summary from fixture, not `POST /withdraw/check` + `combineAvailableBalance`.
- Withdraw/method flows fixture-backed: no live balance, method CRUD, bank/promptpay persistence, KYC gate; web3 absent.
- Date-range filter + status chips + DataGrid have no RN equivalent yet; `navigator.clipboard`/`localStorage` (X1/X2).

### Membership / pricing / subscription / billing
- Stripe checkout/portal not wired (web uses server actions); no deep-link return handling.
- Membership scrollytelling landing not ported (IntersectionObserver count-up/reveal/streak/spend-calc/FAQ).
- Pricing monthly/yearly toggle + most-popular emphasis to reproduce; subscription status states
  (active/past_due/cancelled + portal) and billing skeleton parity unconfirmed; i18n hardcoded.

### GoLink — ✅ no high/critical gaps flagged (one blocker)
- Clipboard auto-paste uses `navigator.clipboard` (X1) — empty-input paste does nothing on device.

---

## C. User-flow parity (9 flows traced end-to-end)

| Flow | Overall | Key blocker(s) |
|---|---|---|
| home search | **mostly-works** | — |
| browse → cashback activation | partial | Shop Now no `onPress` (no deeplink); GoLink result opens fixture href |
| golink | partial | clipboard auto-paste = `navigator.clipboard` (no-op native) |
| quest | partial | `/quest/history` view is a stub (no MoM insight/bars/rewards); FB social quest uses `window.FB` |
| wallet → withdraw → method | partial | submit not wired to API; no live balance; web3 absent; bank/promptpay not persisted |
| profile journey | partial | copy-invite `navigator.clipboard`; subpage edits not persisted |
| auth & onboarding | partial | OTP `123456`; no real Firebase phone/social; cannot complete on device; account-setup + link-mycashback UI-only |
| membership & billing | partial | Stripe checkout/portal not wired; no deep-link return |
| privacy / PDPA / age | partial | consent toggles local-only (not `/api/pdpa/consent`); age-verification no backend call |

**Dead links:** none confirmed. (`/quest/history` resolves to a route but renders a stub — degraded, not broken.)

---

## D. Icon + desktop/mobile responsive (2 verified groups; 7 failed — see caveats)

> Note: some icon findings reference `lucide` — captured **before** the phosphor standardization (commit `0f7b187`).
> Glyph *metaphor* mismatches below still apply (the adapter changed the library, not the chosen glyph per call site).

### Confirmed — Shops / Brand / Shop detail
- **Category aside renders the same filter icon on every row** (was `SlidersHorizontal`) vs web's **per-category glyph**
  (`ShopExploreMenuTapIcon variant=category` / API image). → wrong metaphor; assign per-category icons.
- Related "Explore other shops" cards: Expo = 2-letter initials on a tint block; web = merchant **banner image +
  favorite + Grab-Coupon badge + "View all →"**. → biggest visual-fidelity gap.
- Tracking-notice icon: web stopwatch **emoji ⏱️** vs Expo line icon (Clock). → emoji-vs-icon mismatch.
- Referral badge: web Gift size 14 in a pill vs Expo BadgePercent size 26 in a 52px tile. → glyph + placement.
- Terms panel: web MUI Accordion (HelpOutline + ExpandMore per row, collapsible) vs Expo one static Info + plain
  bullet list. → interaction + glyph.
- "View all →" related-header link present on web (desktop), absent on Expo (`partly`).

### Confirmed — Category / Discover
- Brand/shop cards: web shows merchant **logo image** in a bordered tile; Expo shows tint square + initials fallback.
- Discover "Shop Now": web `rounded-full` pill vs Expo `rounded-lg` (corner-radius mismatch).
- Filter chip active-state color differs slightly (`partly`).

### Confirmed — Desktop/mobile responsive
- **Bottom-nav cross-route inconsistency (verified twice):** `/category` and `/shop/[id]` render
  `CustomerMobileBottomNav` at mobile width; **`/brand`, `/discover`, `/shops` do not.** Inconsistent chrome across
  sibling routes. → small, contained fix.

### Not verified (re-run needed)
Home / auth / profile / wallet / membership / golink icon sets; desktop-grid column counts vs web `lg:`/`md:`
classes; shell header/footer at 1024/1440. **A live Playwright screenshot pass (390/768/1024/1440) is the right tool
to confirm responsive layout — code-grep can't see rendered columns.**

---

## E. Recommended next actions (mapped to plan phases)

1. **Phase 0 primitives** clear the most flows at once: `expo-clipboard` (X1) unblocks copy on profile/referral/
   wallet/golink/shop-detail; `AsyncStorage` (X2) stops native crashes on wallet/missing-orders/privacy-center.
2. **Bottom-nav consistency** (Section D) — standalone, ~S; add `CustomerMobileBottomNav` to `/brand`, `/discover`,
   `/shops` (or remove from `/category` if intentional). Good first contained fix.
3. **Category aside per-category icons** + **shop-detail related-card fidelity** — visual parity, ~M.
4. **Re-run the 7 failed icon groups + 5 failed page groups** with a stricter StructuredOutput contract to close the
   coverage gaps above before committing to a full visual sign-off.
5. **Then** the heavy phases in order: 2 (Firebase auth) → 3 (live data per-domain) → 5 (web3) → 6 (Stripe) → 7 (web
   cutover) → 8 (release), per `MIGRATION_PLAN.md`.

---
*Sources: workflows `w5has5n36` (page/flow) and `wtofk7yu7` (icon/responsive). Raw verified verdicts in the task
output files under the session tasks dir. Synthesis agents returned empty; this report was assembled from the
per-item adversarial verdicts.*
