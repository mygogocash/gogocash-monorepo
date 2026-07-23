# GoGoCash Next.js → Expo Migration Plan

> Status as of audit (2026-05-30). Source of truth for taking the Expo app
> from a fixture-backed parity app to a production cross-platform replacement
> for the Next.js customer web app.

> **Update (2026-06-21): merged into the Turborepo monorepo in PR #1.** The Expo
> app now lives at `apps/app` (package `@gogocash/mobile`); the dated text below
> still says `apps/mobile`, which is the pre-migration path. The `npm run
> mobile:test:full` / `mobile:design-qa` / `npm run validate` commands referenced
> below are not defined in this monorepo — use `npm --prefix apps/app run
> test:full` (and `npx --prefix apps/app playwright test` for design QA). Phase
> targets and audit verdicts are otherwise unchanged and preserved as written.
>
> **Update (2026-06-22):** Customer-app **dark mode** (System / Light / Dark) shipped
> in `apps/app` — see `docs/dark-mode.md`. Stack is Expo SDK 57 + **RN 0.86** +
> react-native-web 0.21.2 (not 0.85).
>
> **Update (2026-06-24):** Desktop home layout polish — scrollable full-bleed footer
> (`CustomerDesktopFooter` inside home `ScrollView`), 2-row desktop brand carousels,
> unified **`Cashback upto`** on `BrandCard`. See `FRONTEND_PARITY_PLAN.md` and
> `docs/desktop-nextjs-parity-plan.md`.

## ★ NORTH STAR — Expo is the single source of truth for ALL platforms

The end state: **`apps/mobile` (Expo Router + react-native-web) is the only
customer-facing client codebase.** One edit ships to **web + iOS + Android**.
No more maintaining a separate Next.js customer UI; no more parity audits
(those exist today only because the same screens live in two places and drift).

- **Build targets from one tree:** `expo export --platform web` → customer web;
  EAS build → iOS/Android.
- **Platform differences live inside the one tree**, never as a second app:
  `Platform.select(...)`, and `.web.tsx` / `.native.tsx` / `.ios.tsx` file
  variants for the rare cases where web and native must diverge.
- **Scope of "single source":** the **customer app** only. `landing-page-main`
  and `Admin` stay separate Next.js products (different audiences/SEO needs).
- **Success condition:** the Next.js **customer** app (`../src/app/[locale]/**`)
  is retired (Phase 7) once Expo web reaches parity; after that an edit happens
  once and reaches every platform.
- **Implication for today:** prefer adding shared, platform-neutral code in
  `apps/mobile/src`; when web-only or native-only behavior is needed, use
  `Platform`/file-extension splits — do NOT fork a screen back into Next.js.
- **Icons:** standardized on **phosphor-react-native** for web + native, behind
  a single adapter module `src/theme/icons.tsx` (one place to change an icon for
  all platforms) — see the Icon Standardization note below.

## RECHECK ADDENDUM (2026-05-30, deep section-by-section pass)

Re-verified after you said "I updated some to align with Next.js." Findings:

- **The Expo `apps/mobile` tree is unchanged** — git-clean at the scaffold
  commit; every file mtime is 2026-05-27. No Expo edits landed.
- **The edits are on the Next.js reference** (`../src/features/*`, 47 uncommitted
  files). The parity *target moved*, so several Expo screens now have **NEW
  drift** they didn't have before. Re-syncing to the moved target is now a
  prerequisite phase (Phase R below) ahead of live-data work.
- Everything Expo-side is still **fixture-backed** (no live API, no Firebase, no
  i18n) — the original big themes hold.

### NEW drift introduced by the recent Next.js edits (verified, file-grounded)
| Screen | What changed on web | Expo action |
|---|---|---|
| **Home** | `Popular` commented out (PageClient L65); `Special` not rendered; `CategoryHome` now **dual-rail** Travel ✈️ + Makeup 💄; `Trending` icon-less | ✅ **ALREADY ALIGNED — verified directly.** Expo fixture `webHomePromoSections` order is Trending Brands (L1780) → Travel Deals (L1831) → Makeup Must Have (L1985); `Special` count = 0; `Popular` exists only as the "Popular right now" search panel, not a home rail. No action needed beyond an emoji spot-check. |
| **Wallet** | `WalletTransaction` Action button split into its own grid column (commit ebdf923) | Replicate dedicated Action column + status-chip color states |
| **Profile** | `ReferYourFriendsRow` moved directly under Profile section (commit e5992c6) | Match new profile menu position |
| **Quest** | `QuestPage` + `ListRank` + `ListShop` edited | Re-check tab layout, leaderboard row shape, mission list vs new versions |
| **Shop detail** | `shop/List.tsx` + `CardBrandLogo` + `offerCardVisuals.ts` edited | Match new offer-card visual logic on related offers |
| **Category/Discovery** | `category/List` + `PolicyBannerSection` + `PolicyTermsSection` + `DiscoverProductCard` + `useCategoryPolicy` edited | Port updated policy banner + collapsible terms + new product card (policy sections were already missing on Expo) |
| **Privacy/Locale** | `LocalePanel` (locale-URL switch fix) + privacy-policy page + `renderLegalMarkdown` edited | Match new LocalePanel switch behavior; re-verify legal markdown |

Screens with **no new web drift** (gaps unchanged from main plan): Money/Withdraw,
Profile detail/phone/offers, Referral, GoLink, Membership/Subscription, Auth/Account-setup.

### Per-screen recheck verdicts
| Screen | dataMode | parity vs *current* web | effort |
|---|---|---|---|
| Home | fixture | near-complete | M |
| Wallet | fixture | partial | L |
| Money/Withdraw+Method | fixture | partial | XL |
| Profile hub | mixed | near-complete | M |
| Profile detail/phone/offers | fixture | partial | L |
| Quest | fixture | partial | L |
| Referral | fixture | partial | M |
| Shop detail | fixture | partial | L |
| Category/Discovery | fixture | partial | L |
| GoLink | fixture | near-complete | S |
| Membership/Subscription | mixed | partial | L |
| Auth/Account-setup | fixture | near-complete | M |
| Privacy/Locale | fixture | near-complete | S |

> ⚠️ Note: the synthesis agent returned empty; the table above is rolled up
> directly from the 13 per-screen records (all of which completed).

---

## Phase R — Re-sync Expo to the moved Next.js target — ~XS  *(reduced to near-zero after reading the real diffs)*

**MAJOR CORRECTION — verified by reading every `git diff` hunk, not agent
inference.** The recheck agents badly overstated this. The 35 changed web files
are **almost entirely Prettier reformatting** (line re-wrapping, trailing-comma
removal, JSX attribute collapsing) with **no behavior or visual change**:

- `home/*` (CategoryHome, Trending, Extra, Popular, Special): every diff is just
  `[dep, country],` → `[dep, country]` (trailing-comma). **Zero parity impact.**
  `PageClient.tsx` (which decides section order/visibility) is **not in the diff
  set at all**, so home order is unchanged by the recent edits. Note: Popular
  *is* commented out in `PageClient` L65 and Special isn't rendered — but that's
  the **committed/pre-existing** state, and the Expo fixture **already matches it**
  (no Popular rail, Special=0; "Popular" exists only as the search panel). The
  agent's "dual-rail / order changed" framing was wrong; the Popular-hidden fact
  was right but is not new and is already aligned. Net: no Expo action.
- `WalletTransaction.tsx`: the only change is collapsing a 3-line `if (...)`
  condition onto one line. **No new Action column, no chip change.** (The "split
  Action column" was commit `ebdf923`, already in the scaffold the audit saw.)
- `ReferYourFriendsRow.tsx`: collapsed a `<ContentCopyOutlinedIcon/>` onto one
  line. **No move, no tint, no copy change.**
- `shop/List.tsx`, `category/List.tsx`, `DiscoverProductCard.tsx`,
  `PolicyBannerSection.tsx`, `PolicyTermsSection.tsx`, `useCategoryPolicy.ts`,
  `CardBrandLogo.tsx`: import-wrapping + emoji-span reformatting only.
  *(One real line in `CardBrandLogo.tsx` adds a `<CategoryChip>` above the title —
  the single genuine visual change in the whole set.)*
- `renderLegalMarkdown.tsx`, `privacy-policy/page.tsx`: Prettier only (it was
  already a hand-rolled markdown renderer, not newly switched to ReactMarkdown —
  agent hallucinated that).
- `quest/{ListRank,ListShop,QuestPage}.tsx`: **1 line each, pure context** (diff
  shows `1 insertion` — a newline). No change.
- `offerCardVisuals.ts`: real but trivial — swaps brand-icon slug `amazon→ebay`
  (Simple Icons dropped Amazon). Cosmetic fallback only.

### The ONLY genuine parity items (both tiny, both optional this phase)
| # | Real web change | Expo action |
|---|---|---|
| R1 | `LocalePanel.tsx` — extracted `buildLocaleHref()` fixing locale-switch so `/th/x`→`/en/x` without a stale/duplicate segment and not trimming `/thailand` | Mirror the same path logic in `CustomerLocaleRegionControl.tsx` (small, has a web `LocalePanel.test.ts` to copy as the spec) |
| R2 | `CardBrandLogo.tsx` — adds a `<CategoryChip>` above the offer title in the non-compact card | Add a category chip atop the Expo brand card (only if you want exact parity; cosmetic) |

**Net: Phase R is essentially a no-op.** There is no real "moved target." The
35-file web diff is a `prettier --write` pass plus two ~minor tweaks. Do R1/R2
opportunistically inside Phase 3; **do not spend a dedicated re-sync phase.**

> Lesson logged: the recheck sub-agents inferred drift from file *names* in the
> changed-set + their own earlier notes, instead of reading the diff hunks. The
> `git diff` is authoritative; their "new drift" section was ~90% false positives.

- **Caveat that still holds:** web edits are uncommitted and in two copies
  (staging = non-git, feature-login-firebase = git). If you do real parity edits
  on web later, re-run `git diff` to scope — don't trust a name-level scan.

---

## 0. Reality Check (what the audit actually found)

This is **not** a framework conversion. `apps/app` is already a mature Expo
SDK 56 app (expo-router, RN 0.86, React 19, react-native-web) with ~48 route
files, a 2,478-line home screen, a 1,042-line auth screen, ~35 parity tests,
and a 2,332-line design handbook. The last handoff reported 204–259 tests green
+ Expo web export + 77 design-QA checks.

**The real remaining work is depth, not breadth:**

1. **Live data** — almost every screen renders static fixtures from
   `src/design/webDesignParity.ts` (2,897 lines). The typed fetch client
   (`src/api/client.ts`) + SecureStore token + React Query exist but per-domain
   query hooks do not. This is the single biggest theme.
2. **Real auth** — Firebase is NOT in mobile deps. Auth UI is complete but
   mocked (OTP hardcoded `123456`, no `signIn`, no session creation).
3. **i18n** — ZERO i18n on mobile. All copy is hardcoded English. No
   `src/i18n`. Web uses next-intl (en/th/jp).
4. **web3 withdrawal + Stripe native** — neither ported (user wants both this scope).
5. **Server routes → NestJS** — 12 Next.js `/api` routes to relocate.
6. **Native clipboard/date/picker primitives** — `navigator.clipboard`,
   `<input type=date>`, `localStorage` used in several screens; these no-op or
   crash on native iOS/Android.
7. **Web cutover + device/EAS/store release.**

### Decisions captured (from you)
- **Web target:** Replace Next.js customer app with Expo (web+native), then retire it.
- **Server logic:** durable logic → NestJS; `+api.ts` only for web same-origin glue.
- **First scope:** full route/visual parity → then live data.
- **Heavy integ:** include web3 + Stripe native in this effort (not deferred).

### Per-route parity (audit verdicts)
| Route group | Parity | Effort | Core remaining work |
|---|---|---|---|
| home | near-complete | M | fixtures→live `/offer*`, dedupe+country, analytics, i18n |
| auth | near-complete | M | wire Firebase, real OTP/social, country picker, redirect |
| golink | near-complete | S | i18n, expo-clipboard, terms panel, auto-dismiss |
| link-mycashback + privacy-policy | near-complete | S | fidelity verify, RN markdown, i18n |
| referral | near-complete | M | tabs, status column, empty state, expo-clipboard, per-user URL |
| profile + account-settings | partial | M | Firebase phone OTP, PUT profile, avatar upload, expo-clipboard, offer DataGrid→FlatList |
| shops | partial | L | fixtures→live API |
| category + discover + brand | partial | L | live API, policy sections, analytics, external Shop Now, i18n |
| credit-score + billing + missing-orders | partial | L | scoreCalculator, real form (picker/date/image), Stripe billing states |
| membership/pricing/subscription | partial | L | Stripe native/WebBrowser checkout, deep-link return, pricing toggle |
| favorite + language + privacy-center + age-verification | partial | M | favorites query+toggle+sort+paginate, PDPA consent API, date picker |
| quest | partial | L | **build /quest/history (dead link today)**, MoM insight, modals→RN, FB SDK |
| wallet | partial* | XL | WalletTransaction history (DataGrid→FlatList), date filter, summary |
| withdraw + method | partial* | XL | balance math, method CRUD, bank/promptpay form, **on-chain web3** |

\* audit said "missing" but that was a wrong path I fed the agents; files exist
flat (`app/wallet.tsx`, `app/withdraw/`, `app/method/`) backed by real screens —
they are fixture-backed/partial, not greenfield.

### Server routes → NestJS (relocation matrix)
| Next.js route | Target | Effort |
|---|---|---|
| `/api/auth/[...nextauth]` | NATIVE: delete→Firebase client SDK + Bearer; WEB: keep thin `+api.ts` cookie glue | XL |
| `/api/brandfetch` | NestJS `GET /offer/brandfetch` (holds key) | S |
| `/api/countries` | NestJS `GET /common/countries` (cached) | S |
| `/api/hello` | NestJS `GET /health` (terminus) | S |
| `/api/pdpa` | NestJS `GET /pdpa` (new PdpaModule) | S |
| `/api/pdpa/consent` | NestJS `GET/POST /pdpa/consent` (DB, userId from auth) | M |
| `/api/pdpa/data-deletion` | NestJS `POST /pdpa/data-deletion` (real erasure) | L |
| `/api/pdpa/data-export` | NestJS `GET /pdpa/data-export` (aggregate User/Point/Withdraw/Involve) | L |
| `/api/stripe/checkout` | NestJS `POST /payment/checkout` (deep-link success/cancel) | M |
| `/api/stripe/portal` | NestJS `POST /payment/portal` (customerId server-side) | M |
| `/api/stripe/webhook` + `/api/webhooks/stripe` | NestJS single `POST /payment/webhook/stripe` (raw body), delete the dup | L |

---

## 1. Guardrails (DISSENT — read before building)

- **Blast radius:** money paths (withdraw, on-chain, Stripe) are R0. A wrong
  chain id, decimals error, or unsigned-tx bug can lose user funds. Every
  withdrawal/payment change needs a failing test seen failing first, then green,
  then full suite green (per CLAUDE.md §3.5: untested critical-path code = R0).
- **Hidden assumption to kill:** "fixtures = parity." Fixtures hide payload
  shape mismatches. Every fixture→live swap must map the real NestJS response
  into the existing view model and prove it with a contract test.
- **Reversibility:** keep the Next.js customer app frozen-but-deployable until
  web cutover (Phase 7) passes parity. Don't delete it before then.
- **Don't regress the green suite.** ~35 parity tests + design-QA are the safety
  net. Run `npm run mobile:test:full` + `mobile:design-qa` after every phase.
- **Two RN-wide refactors block many screens** — do them first (Phase 0) so
  later phases don't each re-solve clipboard/date/storage/i18n.

---

## 2. Phase Plan

Ordered by dependency. Each phase is independently shippable and gated.

### Phase 0 — Foundation primitives (unblocks everything) — R2, ~M
Cross-cutting native gaps that recur in many route audits. Do once, centrally.
- Add deps: `expo-clipboard`, `@react-native-community/datetimepicker`,
  `expo-image-picker`, `@react-native-async-storage/async-storage`,
  `expo-localization`, `expo-web-browser`, `expo-clipboard`.
- `src/lib/clipboard.ts` — wrap expo-clipboard; replace every
  `navigator.clipboard.*` (golink, referral, profile, profile/offer, wallet).
- `src/lib/datePicker.tsx` — RN date control; replace free-text/`<input type=date>`
  (age-verification, missing-orders, wallet/withdraw filters).
- `src/lib/storage.ts` — AsyncStorage wrapper; replace `localStorage`
  (quest rank-up, missing-order claims) — these **crash on native** today.
- `src/lib/toast.tsx` — RN toast/snackbar to replace react-hot-toast feedback.
- **Gate:** typecheck + full suite still green; no `navigator.`/`localStorage`/
  `<input type=date>` left in `src/screens` (add a CI grep test).

### Phase 1 — i18n foundation — R2→R1, ~XL (split into 1a/1b/1c)
Mobile has no i18n. This blocks "parity" on every screen, so land the engine
early then backfill keys as screens are touched.
- **1a (M):** `src/i18n/` — typed catalog loader, `t()` with `{var}`
  interpolation + ICU plurals (use `intl-messageformat`), `en` fallback.
- **1b (L):** generate `en.ts` from web `src/messages/en.json`, `th.ts` from
  `th.json`; preserve keys 1:1. Flag: web `jp.json` is ~83% untranslated — set
  jp→en fallback, raise the backlog to the team, do not block on it.
- **1c (M):** locale store (Context/Zustand) persisted via AsyncStorage,
  default from `expo-localization`; wire `/language`'s switcher + desktop
  `CustomerLocaleRegionControl`.
- **Gate:** `i18n:check`-equivalent for mobile; a CI test catches new hardcoded
  UI strings.

### Phase 2 — Auth + session (Firebase) — R0, ~L
The spine: live data needs real sessions. Native ≠ web here.
- Add `@react-native-firebase/app` + `/auth` (or Firebase JS SDK + RN persistence).
- Native: phone OTP via Firebase (`signInWithPhoneNumber`), Google/Apple via
  `@react-native-google-signin` / `expo-apple-authentication`; obtain Firebase ID
  token → exchange for app session → persist in SecureStore (store exists).
- Web: keep `+api.ts` NextAuth cookie glue (per your decision).
- Wire `auth/callback` `?token` deep-link exchange; real OTP (drop hardcoded
  `123456`); resend timer; country picker over live `/common/countries`;
  post-login redirect (`resolvePostLoginHref`), PostHog/meta identity.
- **Gate (R0):** RED tests for token exchange, 401→logout, protected-route
  redirect, logout clears SecureStore — seen failing, then green.

### Phase 3 — Live data layer (fixtures → API) — R1, ~XL (split per domain)
The biggest theme. Pattern per domain: write React Query hook on `api/client`,
map NestJS payload → existing view model, keep fixture as test/fallback, prove
with a contract test. Ship domain-by-domain (pipeline, not big bang):
- **3a Offers/home (L):** `/offer`, `/offer/banner-home`, `/offer/get-category/list`;
  home Banner/Trending/Category/Extra, shops, brand, category, discover; port
  `dedupeOffersByBrand` + `useUserCountry`; analytics trackers; external Shop Now.
- **3b Profile/account (M):** `/user/profile` (GET+PUT), balance, `/offer/my-offers`;
  avatar upload; offer DataGrid→FlatList; phone OTP via Phase 2.
- **3c Wallet/transactions (L):** `/withdraw/check`, conversion + withdraw history,
  summary; WalletTransaction DataGrid→FlatList, date filter, summary hero.
- **3d Quest (L):** `/point/get-quest-open`, `get-quest-social`, `check-points`,
  `my-quest-list`, `quest-history-summary`; **build `/quest/history`** (dead link
  today); MoM insight (pure TS ports as-is); modals→RN; FB SDK→`react-native-fbsdk-next`/stub.
- **3e Referral/favorite (M):** `/point/referral-list`, `/offer/favorite/*`,
  `favoriteOffer`; referral tabs+status+empty+per-user URL; favorites
  query/toggle/sort/paginate.
- **3f PDPA/credit/missing-orders (L):** consent endpoints, `scoreCalculator.ts`
  (pure, ports as-is), real missing-orders form (picker/date/image via Phase 0).
  **Client done (2026-07, `cf56e655`):** cookie banner dismiss persistence
  (`src/pdpa/cookieConsentStorage.ts` — web `localStorage`, native SecureStore).
  **Still open:** NestJS `/pdpa/consent`, Privacy Center API sync, analytics gating.
- **Gate:** contract test per domain; backend loading/empty/error/offline states
  already scaffolded — verify each renders with live API.

### Phase 4 — Server routes → NestJS — R1, ~L (backend track, parallel to 3)
Implement the relocation matrix (§0). Order: countries/brandfetch/health/pdpa
descriptor (S) → pdpa consent (M) → pdpa export/deletion (L) → payment
checkout/portal/webhook (M/L). Point Stripe dashboard at the single NestJS
webhook; delete the Next dup. Update mobile clients to call NestJS paths.
- **Gate:** Swagger updated; webhook idempotency test; secrets server-side only.

### Phase 5 — web3 withdrawal (on-chain) — R0, ~XL
Core cashback payout. Highest financial risk.
- Port `src/lib/web3/*` + `constants/abi/*` (Polygon/BNB/Sonic/Celo); use
  `viem`/`ethers` RN-compatible build; WalletConnect via `@walletconnect/*` or
  `@reown/appkit`; Crossmint custodial path; KYC gate
  (`isWithdrawProfileKycComplete`).
- **Gate (R0):** RED tests for chain selection, decimals, amount math
  (`combineAvailableBalance`), unsigned-tx rejection — seen failing → green;
  testnet dry-run before any mainnet path is enabled.

### Phase 6 — Stripe native (GoGoPass) — R1, ~L
- `@stripe/stripe-react-native` OR `expo-web-browser` → NestJS
  `/payment/checkout`; deep-link return (`gogocash://…`) replaces URL
  searchParams notifier; billing portal; pricing toggle; subscription states.
- Decide: port the membership scrollytelling landing (IntersectionObserver/CSS,
  high RN effort) or ship member-status view only. **Recommend status-only first.**
- **Gate:** checkout success/cancel deep-link tests; no Stripe secret in Expo env.

### Phase 7 — Web cutover + retire Next.js customer app — R1→R0, ~M
- Expo web export becomes the customer web build; point `app.gogocash.co` at it.
- Verify web-only shims (CustomerDesktopHeader/Footer, cookie banner, LINE FAB,
  metadata/sitemap/manifest) and SEO basics.
- Run full route parity (39-route matrix) Expo-web vs frozen Next reference.
- Freeze, then retire the Next.js customer app once green. Landing + Admin stay Next.js.
- **Gate (R0 for the DNS/deploy flip):** parity matrix green; rollback = repoint to frozen Next.

### Phase 8 — Device + release readiness — R0, ~L
- Maestro E2E (first launch, locale switch, auth, shop detail, wallet, withdraw,
  deep links, offline, logout); EAS preview + production build smoke; iOS sim +
  Android emulator + real-device smoke.
- App Store privacy answers + Google Play data-safety; Sentry + PostHog smoke
  events; confirm Firebase prod project ownership; no secrets committed.

---

## 3. Sequencing & parallelism
```
Phase 0 ─┬─ Phase 1 (i18n) ───────────────┐
         └─ Phase 2 (auth, R0) ─┬─ Phase 3 (live data, per-domain pipeline)
                                 └─ Phase 4 (NestJS, backend track) ──┘
Phase 3 ──► Phase 5 (web3, R0) ──► Phase 6 (Stripe) ──► Phase 7 (web cutover) ──► Phase 8 (release)
```
- Phase 0 first, always.
- Phases 1, 2, 4 can run in parallel after 0 (1 = i18n, 2 = mobile auth, 4 = backend).
- Phase 3 domains pipeline independently once 2 lands.
- 5/6 need 3+4; 7 needs 3/5/6 web parity; 8 last.

## 4. Definition of done (per CLAUDE.md)
- R0 work (auth, withdraw, web3, Stripe, cutover): failing test seen failing →
  green → full suite green, output shown. No "should work."
- `npm run mobile:test:full` + `MOBILE_PLAYWRIGHT_NO_SERVER=1 npm run mobile:design-qa`
  + `npm run validate` green after every phase.
- No fixtures on a production critical path without a live contract test.
- `spec.md` updated per change; example env updated for new vars.
