# Mobile i18n — Phase 1 Plan (handoff)

> **Status: Phases 1–2 COMPLETE. Phase 3 ~COMPLETE (2026-06-02b): ALL routed customer screens keyed with
> `useCopy`/`tc()` — chrome, auth, home, discovery, + 25 screens incl. the full account hub, profile
> cluster, wallet/withdraw/money, quest, membership/subscription, gogosense, golink, category detail,
> privacy, age-gate, auth-callback. Waves 1–2 used parallel subagents (one screen each) + central overlay
> merge + a source-of-truth tc()-literal coverage test. Utility + NativeParity dropped (dead/unrouted).
> + secondary home/discovery copy. Suites green: source 309, render 27, tsc 0. Overlay holds ~304
> machine-authored Thai strings — NEEDS NATIVE REVIEW (checklist: `npm run gen:i18n-review` →
> `docs/i18n-thai-review.md`). All known web-th gaps FIXED + re-synced (`navCreditScore`, `shopTypeMall`,
> `shopTypePreferred`). No known remaining English-in-Thai surfaces; only the machine-Thai review pass is
> outstanding.**
> Phase 2 added `EN_VALUE_TO_KEY` (reverse index, ~92% of catalog values unique) + `useCopy()` (`src/i18n/useCopy.ts`):
> `tc(englishString)` reverse-looks-up the shared English copy to its catalog key and formats it in the
> active locale, falling back to the input when no key matches — so screens reuse the web translations
> with NO hand-authored ids. Reference impl: `CustomerAuthScreen` (title/subtitle/labels/privacy all
> switch en↔th). TDD: `src/__tests__/i18n-usecopy.render.test.tsx` (3 tests). Lazy-loading `th.json`
> (143KB) was DEFERRED — orthogonal web-only perf; eager import is fine for now.
> Shipped: `react-intl` + `expo-localization` installed; `src/i18n/` (`locales.ts`, `messages.ts` with
> nested→dot flattening, `localeStorage.ts`, `LocaleProvider.tsx`); catalogs synced into
> `src/messages/{en,th}.json` via `scripts/sync-i18n-catalogs.mjs` (`npm run sync:i18n`);
> `LocaleProvider` mounted in `AppProviders`; `CustomerLocaleRegionControl` now switches + persists
> the real locale; auth title proves the round-trip via the `navSignIn` key. Verified: en↔th switch
> changes a real string, persists to storage, survives reload; `tsc` exit 0; render suite 27/27 green;
> no console errors. NOTE: native Hermes ICU polyfills (`@formatjs/intl-*`) were NOT added — only needed
> for plural/number/date formatting on native, and unverifiable without a simulator. Add them when
> native is built/tested (see Phase 1 step 1).
>
> **Decision (locked):** Use **FormatJS / `react-intl`** and **reuse the web's existing ICU catalogs**.
> **Scope:** **en + th** only. `jp` is web-only (the mobile locale picker `webLocaleRegionPanel.languages` offers just `en`/`th`).
> **R-tier:** R1 — architectural, eventually touches ~every screen. Phase 1 itself is additive/low-risk.

---

## Why this approach

- Web app uses **`next-intl`** (ICU MessageFormat) with catalogs at repo-root `src/messages/`:
  `en.json` (~84KB), `th.json` (~143KB, Thai mostly done), `jp.json` (~25KB, web-only).
- `react-intl` consumes the **same ICU MessageFormat**, so the Thai work is reusable rather than re-translated.
- Mobile currently has **no i18n** (no lib, `expo-localization` not installed) and the locale picker
  (`src/components/CustomerLocaleRegionControl.tsx`) is **cosmetic** — `selectedLanguage`/`selectedRegion`
  are local `useState` with no persistence and no string switching.

## The central wrinkle (drives Phase 2, not Phase 1)

Mobile copy lives in `src/design/webDesignParity.ts` as `as const` **English literals**, not keyed to the
web catalog keys. So full catalog reuse needs a **mapping pass** (mobile copy → web ICU keys). Phase 1 does
NOT solve this — it stands up the infra and proves one string round-trips. Phase 2 does the mapping/assembly.

---

## Phase 1 — infrastructure (~6–8 files, additive)

### 1. Dependencies
- `react-intl` (FormatJS).
- `expo-localization` (device locale detection via `getLocales()`).
- Native ICU polyfills for Hermes (web uses the browser `Intl`, native needs these):
  `@formatjs/intl-locale`, `@formatjs/intl-pluralrules`, `@formatjs/intl-numberformat`,
  `@formatjs/intl-datetimeformat` — import the polyfills + locale-data for `en`,`th` at app entry,
  guarded so web (which has native `Intl`) skips them. Verify which Hermes build already ships `Intl`
  before adding every polyfill (Expo SDK 56 / RN 0.85 — Hermes has partial Intl).

### 2. Locale provider + persistence (new files under `src/i18n/`)
- `src/i18n/locales.ts` — `SUPPORTED_LOCALES = ["en","th"] as const`, `type Locale`, `DEFAULT_LOCALE = "en"`.
- `src/i18n/messages.ts` — load the en/th catalogs (see "Catalog access" below) keyed by locale.
- `src/i18n/LocaleProvider.tsx` — React context wrapping `<IntlProvider locale messages>`;
  exposes `useLocale()` → `{ locale, setLocale }`. On mount: read persisted locale → else device locale
  (`expo-localization`) if supported → else `DEFAULT_LOCALE`.
- `src/i18n/localeStorage.ts` — persist/read selected locale.
  **Cross-platform storage:** `@react-native-async-storage/async-storage` (it maps to `localStorage` on web),
  or a thin `Platform.select` wrapper. Check what the app already uses for persistence (the auth/session
  layer may already have a storage util — reuse it; grep `AsyncStorage`/`localStorage`).
- Mount `<LocaleProvider>` at the app root (the expo-router root layout, `app/_layout.tsx`).

### 3. Wire the existing picker (make it real)
- `src/components/CustomerLocaleRegionControl.tsx`: replace the cosmetic `selectedLanguage` state with
  `useLocale()`; selecting a language calls `setLocale(...)` (persists + re-renders translated tree).
  Region can stay cosmetic for Phase 1 (region ≠ language).

### 4. Proof catalog (Phase 1 only — small)
- Add a handful of keys to a mobile en/th catalog (or reuse a few real web keys) and translate ONE visible
  surface (e.g. the auth screen title `webAuthPage.titleByMode`) through `intl.formatMessage`/`<FormattedMessage>`.
- **Goal of Phase 1 = prove the round-trip:** switch picker en↔th → a real on-screen string changes →
  selection persists across reload. Not full coverage.

### Catalog access (monorepo boundary)
Web catalogs are at repo-root `src/messages/`, mobile is `apps/mobile/`. Pick one:
- **(preferred)** a small sync script copying `en.json`/`th.json` into `apps/mobile/src/messages/` (keeps Metro
  inside the package; document the script so catalogs stay in sync), **or**
- a Metro `watchFolders` + alias to import the root catalogs directly (no duplication, but widens Metro's root).
Decide in Phase 1; Phase 2 depends on it.

---

## Phase 2 — catalog reuse mechanism — DONE
- Built `useCopy()` reverse-lookup (`tc(englishString)`) instead of hand-mapping keys: the mobile copy
  was derived from the same web design, so an English value almost always matches a catalog value
  (1374 keys → 1237 distinct values; only ~93 ambiguous, and those resolve to the same Thai for display).
- This means Phase 3 needs NO per-string id authoring — just wrap copy usages with `tc(...)`.
- Deferred: lazy-loading `th.json`; new mobile-only keys for any copy with no web match (add to en+th
  catalogs + re-run `npm run sync:i18n` — but in practice almost everything matches).

## Phase 3 — screen keying — IN PROGRESS
- Pattern: add `const tc = useCopy()` to a component and wrap copy usages: `tc(webDesignParity.X)`,
  `tc(item.label)`, placeholders, accessibilityLabels. For `{year}`-style templates, `tc(template).replace(...)`.
  The feared `as const` breakage did NOT materialize — `tc(string)=>string` wraps the value at the
  consumption site, leaving `webDesignParity`'s structure/types intact.
- **Coverage harness (added 2026-06-02b):** `src/__tests__/i18n-screen-copy-coverage.test.ts` — one
  `describe` block per migrated screen asserting each prose string it renders resolves to a non-English
  Thai value (`translateCopy(s,"th") !== s`). This is the RED→GREEN driver: a string with no catalog
  match fails here (silent-fallback guard) → fix the catalog → GREEN, then wrap the screen. Exclude
  brand names ("LINE","GoGoPass") and data (amounts, IDs, dates, URLs, English image-asset alts).
- **Mobile-only copy overlay (added 2026-06-02b):** `sync:i18n` is a plain overwrite-copy, so mobile-only
  strings put in `src/messages/{en,th}.json` get CLOBBERED. Put them in
  `src/messages/mobile-overlay.{en,th}.json` instead — merged on top of the synced web catalogs in
  `messages.ts` (spread last; reverse index is first-key-wins so web values still win). Overlay Thai is
  MACHINE-AUTHORED — flag for native review.
- **DONE & verified in th:**
  - Shared chrome — `CustomerDesktopHeader`, `CustomerMobileBottomNav`, `CustomerDesktopFooter`;
    `CustomerAuthScreen` (Phase 2 reference).
  - `CustomerHomeScreen` (GoLink/shortcuts/section headers/nav), `CustomerDiscoveryScreen` (4 directory
    headers + pills).
  - `AccountPageShell` (shared) — desktop profile rail (9 labels) + `AccountWalletHeroCard` (kicker,
    Withdraw, avatar alt). **This Thai-izes the rail across ALL ~14 account screens.** Note: its exported
    `CashbackSummaryBreakdown`/`webWalletSummaryMetrics` are UNUSED (dead) — left unwrapped.
  - `CustomerWalletScreen` — header, support banner, cashback summary + metrics, tabs, filter pills,
    empty state, not-ready props. (a11y summary with embedded numbers left English — needs ICU params.)
  - `CustomerMissingOrdersScreen` — title/intro/actions, all sections (titles/helps/field labels/values/
    helpers), bullets, quick cards, FAQ.
  - `CustomerReferralScreen` — title, earn card, invitation tabs/columns/status, FAQ, not-ready props.
    (hero/steps banners are English PNG assets — alts left English.)
  - `CustomerMembershipScreen` — hero, benefits, billing toggle, perks, savings, social proof, FAQ
    (12 mobile-only strings added to overlay; ฿ prices/"GoGoPass" kept as data/brand).
  - `CustomerCreditScoreScreen` — hero, progress, breakdown rows, benefits, streak, boost (15 mobile-only
    strings in overlay). Proper-nouns kept English: "Starter"/"Trusted" tiers, "⭐ Starter — 💜 Trusted".
    **KNOWN GAP:** the "My Rating Score" title stays English — the web th catalog leaves `navCreditScore`
    untranslated and web wins the reverse index, so the overlay can't override. Fix: translate
    `navCreditScore` in the web th catalog + re-sync (fixes both apps).
  - `CustomerAgeVerificationScreen` — all PDPA copy (already covered by web pdpa* keys; no overlay needed).
  - `CustomerFavoriteBrandsScreen` — title, hero, sections, brand-card chips/labels (2 overlay: "Saved",
    "Others" category; brand names + cashback % + "GoGoCash" logo alt kept as data/brand).
  - `CustomerWithdrawMethodScreen` — title/heading/add/default (all web-covered; no overlay). Account/bank
    names + masked numbers kept as data.
  - `CustomerSubscriptionScreen` (all 3 modes pricing/subscription/billing) — hero, plan cards, status +
    billing panels, not-ready props (12 overlay strings; THB amounts kept as data; plan CTAs + "GoGoPass
    Annual" turned out web-covered). Pricing mode visually verified; other modes share the same keyed copy.
  - `CustomerAuthCallbackScreen` — all 4 state titles + 4 bodies + "Back to sign in" (9 overlay; transient
    OAuth-redirect screen — verified via coverage + tsc + render, not visual).
  - `CustomerLinkCashbackScreen` — title/subtitle/card/skip/link (all web-covered) + 2 a11y route labels
    (overlay). "GoGoCash"/"MyCashBack" image alts kept as brands.
- **DEAD CODE (dropped from scope — not routed):** `CustomerUtilityScreen` (its 4 modes duplicate the
  dedicated AgeVerification/CreditScore/Membership/MissingOrders screens) and `NativeParityScreen`. Verify
  with `grep -rln <Screen> app/` before keying any further — skip unrouted screens.
- **Waves 1–2 (parallel subagents, 2026-06-02b) — DONE:** Profile, ProfileOffers, ProfilePhone,
  AccountSettings, PrivacyCenter, PrivacyPolicy (wave 1) + ProfileDetail, AccountSetup, Quest, MoneyAction,
  GoGoSense, GoLink, CategoryDetail (wave 2). Each agent wrapped one screen + reported mobile-only strings;
  ~213 wave-2 overlay pairs merged centrally via a dedup / skip-web-collision script. Verified by
  `i18n-wave2-tc-coverage.test.ts` (extracts `tc("...")` literals from each screen source → asserts Thai) +
  an overlay-integrity test (every overlay entry reverse-resolves, not shadowed by web). Profile + GoGoSense
  visually spot-checked in th.
- **Parallel approach / gotchas (for any future bulk i18n):** agents own ONE screen file each (no write
  conflict) and do NOT touch shared files (overlay, coverage test, webDesignParity); central reconcile
  dedups vs existing overlay + skips web-collisions; the per-agent probe loads ONLY the web catalogs (not
  the overlay), so it re-flags already-overlaid + dead (`navCreditScore`-style) strings — dedup centrally.
  Two wrap patterns: inline `tc("literal")` (regex-verifiable against source) vs prop/constant `tc(prop)`
  (verify via overlay-integrity + visual). Some agents over-stepped (literal→constant refactor; splitting
  `"GoGoQuest History"`), shifting JSX-literal parity assertions in `account-hub-parity.test.ts` — fix by
  updating the assertion to the wrapped form or reverting to the in-place literal wrap.
- **Remaining:** secondary copy on home/discovery cards (sort labels, result counts, card-level
  store/product/category labels); the `navCreditScore` web-th gap. The ~280 overlay Thai strings need a
  native-speaker review pass before shipping.
- **Gotchas discovered (apply going forward):**
  - Any component using `useCopy` must render under `LocaleProvider`. `AppProviders` had a fonts-loading
    early-return rendering chrome OUTSIDE the provider → wrap EVERY return path (fixed).
  - The render harness stubs `@mobile/i18n/useCopy` → passthrough (screen render tests don't mount
    providers). So new screens using `tc()` mount fine; no per-test provider needed.
  - `useCopy` does a DIRECT catalog lookup (no `formatMessage`) — static copy with apostrophes/braces
    would otherwise throw ICU FORMAT_ERRORs.
  - **Interpolated strings can't reverse-lookup.** `CustomerAccountResourceState`'s loading/error/offline
    copy uses `` `Loading ${resourceLabel}` `` templates — no stable key. DEFERRED; needs real ICU
    `formatMessage` with a placeholder. (Its STATIC `emptyTitle`/`emptyBody` props ARE keyed per screen.)
  - **Source parity tests assert on exact JSX** (e.g. `account-hub-parity.test.ts` checked `{row.status}`);
    wrapping with `tc(...)` shifts the literal — update the assertion to the wrapped form.
  - **Verifying auth-gated account screens on Expo web:** set `localStorage["gogocash.mobile.session.v1"]
    = {"access_token":"mock..."}` + `localStorage["gogocash.locale"]="th"`, then navigate to the route.
- Verify each surface in **both locales** at breakpoints 320/768/1024/1440 (Thai runs longer — watch
  truncation). en/th are LTR, so **no RTL work**.

---

## Verification (per house rules: see red→green, show output)
- Phase 1 done = picker switches en↔th, a real string changes on screen, selection persists across reload,
  `tsc --noEmit` exit 0, no console errors. Verify on Expo web (`preview_*`); note native ICU/ polyfill
  verification is limited without a device/simulator — call that out honestly.

## Risks / notes
- ICU polyfills on Hermes are the most likely setup snag — budget time there.
- Keep `LocaleProvider` value stable (memoize) so the whole tree doesn't re-render on every parent render.
- `react-intl` needs a stable `key`/`locale` change to re-render translations — switching `locale` prop on
  `IntlProvider` handles this.
