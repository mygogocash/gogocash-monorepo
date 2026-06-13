# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Offer editor — Cashback Management & 30%-fee toggle (2026-06-07):** `FormOffer` groups commission/product-type/max-cap into a **Cashback Management** section (Max cap renders under the commission input) with a **Manual / Auto apply 30% fee** toggle — Auto saves the raw partner number reduced by the fee (`raw × 0.7`) via `src/lib/commissionFee.ts`. The two logo uploads were merged into one 1:1 **Logo** (used for desktop and mobile) plus a **Brand cover**, and top-level sections are separated by divider lines.
- **Offer editor — single editable Terms & Conditions (2026-06-07):** one `custom_terms` field with a **Terms template** source select (custom per shop / automatic / a category) that seeds a per-category sample, a **Back to default** button, a read-only **Preview** box, and a per-section Edit → Cancel/Save that issues an independent partial PATCH of `policy_category_id` + `custom_terms` + `note_to_user`. An **Add note to users** toggle (`note_to_user`) moved here from Brand Info. Resolution logic + sample terms live in `src/lib/offerPolicyTerms.ts` (`OFFER_MOCK_TERMS`, `CATEGORY_MOCK_TERMS`, `resolveOfferPolicyBaseTerms`).
- **Brands list polish (2026-06-07):** `OffersTable` gains a compact inline filter bar (shared `SearchBar` + `SortByDropdown` for the country filter and a flat/grouped **View** dropdown), a `NoData` empty state, a single primary **New Brand** actions dropdown (replacing the separate Create-brand + Sync buttons), and a `Total: N brands` title. The country filter is now actually applied in the mock (`COUNTRY_FILTER_TO_CODES` in `src/data/mockPendingOffers.ts` maps dropdown names to ISO codes), and the brand editor opens inline under the app layout instead of as a fullscreen modal.

### Removed

- **Standalone `/wallet` page (2026-06-07):** removed the route, its sidebar nav entry, the Users-tab link, the `wallet` RBAC prefix, the `getWallets` API, and the `WalletManagement` component. Wallet actions now live only in the per-user **Cashback Wallet** section on the user detail page.

### Added

- **Cashback approval workflow:** the user detail page (`/withdraw/:id`, Conversions tab) gains a **Cashback Wallet** section. "Adjust Wallet" opens an inline panel (`src/components/wallet/UserWalletPanel.tsx`) to freeze/unfreeze and file an "add extra cashback" request — adding files a **pending** "Extra cashback" conversion rather than crediting immediately. An inline notice (`src/components/wallet/CashbackApprovalNotice.tsx`) lists pending requests with Approve (credits the cashback balance) / Reject (no credit, with an optional rejection reason).
- **Conversion earning columns:** the All Conversions grid adds **GGC Earning** (flat 30% of payout) and **User Earning** (payout minus system fee; "Extra cashback" rows show the full payout) via `src/lib/conversionFormat.ts`, plus a per-page size dropdown (5/10/15/20).
- **RBAC module:** tiered **and dynamic** roles (`super_admin`/`admin`/`editor`/`viewer` + runtime-created custom roles), a `resource:action` permission matrix, Role Management UI (`/roles`), and three-layer enforcement (edge proxy, client guard, API). See `docs/RBAC.md`.
- **Admin Management** sidebar section (Users Admin + Roles) with a Role column on the admin-users table.
- **Dashboard insights:** range control with presets + auto-filled From/To inputs, executive summary, analytics, and statistics chart.
- Shared validation helpers (`src/lib/formValidation.ts`) and the `useObjectUrl` hook (`src/hooks/useObjectUrl.ts`).
- **Docs:** `docs/DESIGN_SYSTEM.md` (tokens/typography/components), `docs/PROJECT_STATUS.md` (progress/handoff), and commit/changelog workflow (`docs/COMMITS_AND_CHANGELOG.md`).

### Changed

- Reorganized nav: **Admin Management** (Users Admin + Roles) split out from **Users Management**.
- **App-wide formatting polish:** dates render `dd/mm/yyyy` (`src/lib/dateFormat.ts`), money shows the ISO currency code as a suffix (e.g. `149 THB`) instead of a symbol (`src/lib/currencyFormat.ts`), and status badges share a unified rounded-rect base (`src/lib/statusBadge.ts`) while cycle/tier badges stay rounded-full pills. Added a shared `NoData` empty state and a `StackedDateTime` cell, design-system buttons (`src/components/ui/button/`) with a `variant="outline"` PrimaryButton, and an `activeLabelClassName` prop on `Switch`.
- Reorganized the user detail page into a **Benefits & Scoring** tab with member/admin benefit cards.
- Fee-form money inputs switched to `type="number"`; AdminUsers pagination now derives `hasNext/PrevPage` from the API response.

### Fixed

- Project-wide bug hunt: pagination clamping, `update-offer` NaN guard, PUT persistence + 404s for unknown ids, unimplemented-DELETE → 404, monotonic conversion ids, `formatPrice` zero handling, blob-URL leaks (→ `useObjectUrl`), debounced search + out-of-order response race guards on list tables, stable list keys, admin-user avatar crash guard, and `Promise.allSettled` on the recent-activity widget.

### Security

- Server-side write enforcement: every non-GET mock route is permission-gated (`requiredWritePermission` in `mockApiCore.ts`, **fail-closed** for unmapped `admin/*` writes), closing the gap where only `adminUsers:manage` was checked.
- JWT role backfill now defaults to **least-privilege** (`DEFAULT_ROLE`) outside mock mode instead of `super_admin`; unauthenticated `/api/*` returns `401`.

---

## [2.0.2] - TBD

_Backfill this section when you adopt this changelog: set the real release date and summarize changes from `git log` or merged PRs. Optional: add compare links at the bottom of the file once the remote URL is fixed._

<!-- [Unreleased]: https://example.com/compare/v2.0.2...HEAD -->
<!-- [2.0.2]: https://example.com/releases/tag/v2.0.2 -->
