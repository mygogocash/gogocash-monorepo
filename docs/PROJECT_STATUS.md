# Project Status & Handoff — GoGoCash Admin

Snapshot of where the codebase is so a new contributor (human or AI) can continue with context. Pair this with [`AGENTS.md`](../AGENTS.md) (conventions), [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (UI), and [`docs/RBAC.md`](./RBAC.md) (access control).

_Last updated: 2026-06-07 (branch `staging`)._

---

## 1. What this is

Internal **Next.js 16 (App Router)** admin dashboard for GoGoCash — users, offers/brands, coupons, withdrawals, conversions, banners, quests, fees, membership/subscription/credit-score, and admin/role management. **Mock-heavy:** most flows hit `/api/mock/*` backed by in-memory fixtures, so it runs fully offline. Auth is **NextAuth v4** (credentials → JWT); mock sign-in is any email + password `1234`.

**Stack:** React 19 · TypeScript · Tailwind v4 · TanStack Query v5 · Axios · ApexCharts/Recharts · NextAuth v4 · Vitest. Middleware is **`src/proxy.ts`** (Next 16 renamed `middleware` → `proxy`).

---

## 2. Architecture quick map

| Concern                  | Where                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mock API dispatcher      | `src/lib/mockApiCore.ts` → routes by path/method, mutates `src/app/api/mock/data.ts`                                                               |
| Feature-area mock writes | `src/lib/mockAdminFeatures.ts` (credit-score, membership, subscription, wallets, …)                                                                |
| API client               | `src/lib/api.ts`, `src/lib/api/*`; React Query in `src/lib/query/*`; hooks in `src/hooks/useApi.ts`                                                |
| Auth                     | `src/app/api/auth/[...nextauth]/route.ts`, role logic in `src/lib/mockAdminRole.ts`, types in `src/types/next-auth.d.ts`                           |
| RBAC                     | `src/lib/rbac/*` (roles, permissions, dynamic role store), enforced at `src/proxy.ts` (edge), `RoutePermissionGuard` (client), `mockApiCore` (API) |
| Dashboard insights       | `src/lib/dashboardInsightsBuilder.ts`, `src/lib/insightRange.ts`, `src/components/ecommerce/*`                                                     |
| UI shell                 | `src/layout/AppSidebarContent.tsx`, `AppHeader.tsx`; design tokens in `src/app/globals.css`                                                        |

---

## 3. Recently completed (this + prior sessions)

### RBAC module (new)

- Tiered **and** dynamic roles: built-ins `super_admin / admin / editor / viewer` plus custom roles created at runtime via **Role Management** (`src/components/admin/RoleManagement.tsx`, `/roles`).
- `resource:action` permission strings (`src/lib/rbac/permissions.ts`); in-memory role store (`src/lib/rbac/roleStore.ts`) is the server source of truth.
- **Three enforcement layers:** edge proxy (built-in tiers), client `RoutePermissionGuard` + `usePermissions()`/`<Can>` (covers custom roles), and the mock API.
- **Server write enforcement:** every non-GET mock route is gated by `requiredWritePermission()` in `mockApiCore.ts` (fail-closed for unmapped `admin/*` writes). See `docs/RBAC.md`.
- Sidebar reorg: **Admin Management** section (Users Admin + Roles) separate from **Users Management**.

### Cashback approval workflow (new)

- **Cashback Wallet** section on the user detail page (`/withdraw/:id`, Conversions tab). **Adjust Wallet** opens an inline panel (`src/components/wallet/UserWalletPanel.tsx`): freeze/unfreeze plus an "add extra cashback" form. Adding does **not** credit immediately — it files a _pending_ "Extra cashback" conversion.
- Inline **Cashback approval needed** notice (`src/components/wallet/CashbackApprovalNotice.tsx`) lists pending requests with Approve / Reject (no centered modal). Approve credits the wallet cashback balance + marks the request approved; Reject expands the row for an optional rejection reason and records it with no credit.
- Pure libs (unit-tested): `src/lib/cashbackRequests.ts`, `src/lib/walletAdjustment.ts`, `src/lib/cashbackTotals.ts`; conversion money columns (GGC/User earning) via `src/lib/conversionFormat.ts`.
- Mock backend: `addManualCashbackConversion()` / `setManualCashbackStatus()` in `src/app/api/mock/data.ts`; wallet routes (`admin/wallets/:uid/adjust|freeze|unfreeze`, `admin/wallets/cashback-request/:id`) in `src/lib/mockAdminFeatures.ts`, all gated by `users:manage` via `requiredWritePermission()`.

### Offers/Brands editor & policy (this session)

- **Standalone `/wallet` page removed** — route, sidebar nav, users tab entry, RBAC prefix, the `getWallets` API, and `WalletManagement` component are gone. Per-user wallet adjustment/cashback routes (`admin/wallets/*` in `mockAdminFeatures.ts`) stay — they back the cashback workflow above.
- **Brands list** (`src/components/offer/OffersTable.tsx`): compact inline filter bar (shared `SearchBar` + `SortByDropdown`, country filter + flat/grouped "View" toggle), `NoData` empty state, a single "New Brand" actions dropdown, and a "Total: N brands" title styled like the GoGoCash Users table. The country filter is now actually applied in the mock — `COUNTRY_FILTER_TO_CODES` (`src/data/mockPendingOffers.ts`) maps dropdown labels to ISO codes filtered in `mockApiCore.ts` (`offer/admin`). The editor opens inline under the app layout, not as a fullscreen modal.
- **Offer editor** (`src/components/offer/FormOffer.tsx`): commission entry has a "Manual / Auto apply 30% fee" toggle (Auto: raw × 0.7 = saved net; `src/lib/commissionFee.ts`, unit-tested). The two logo uploads were merged into one 1:1 "Logo" (desktop + mobile) plus a "Brand cover"; a "Cashback Management" section groups commission/product-type/max-cap; top-level sections are divider-separated.
- **Policy / T&Cs:** one editable T&C field (`Offer.custom_terms`) with a "Terms template" source select (custom / automatic / a category) seeding a per-category sample, a "Back to default" button, a read-only preview, a per-section Edit → Cancel/Save doing an **independent partial PATCH** of `policy_category_id` + `custom_terms` + `note_to_user`, and an "Add note to users" toggle (`Offer.note_to_user`). Resolution + sample terms live in `src/lib/offerPolicyTerms.ts` (`OFFER_MOCK_TERMS`, `CATEGORY_MOCK_TERMS`, `resolveOfferPolicyBaseTerms`), unit-tested; `admin/update-offer` in `mockApiCore.ts` merges those fields per-field.

### Dashboard insights

- Range control with presets (7d/30d/90d/All) + auto-filled From/To inputs (`DashboardInsightRangeControl`), Executive Summary, analytics, and `StatisticsChart` (Clicks/Conversions/Sale/Earnings).

### Project-wide bug hunt (21 findings + low-severity tail) — all fixed

- **Authorization:** closed the gap where only `adminUsers:manage` was enforced and `mockAdminFeatures` writes were ungated.
- **Data correctness:** pagination clamping, `update-offer` NaN guard, PUT persistence + 404s, fake-DELETE → 404, monotonic conversion ids.
- **Money/validation:** `formatPrice` zero handling, fee inputs → `type=number`, and shared validators (`src/lib/formValidation.ts`) wired into conversion/coupon/credit-score/tx-hash flows.
- **React correctness:** blob-URL leaks → `useObjectUrl` hook, debounced search + request-id race guards on list tables, stable list keys, username crash guard, `Promise.allSettled` on the activity widget.

---

## 4. Tests & quality gates

```bash
npm test          # vitest — 292 tests across 38 files (all green)
npx tsc --noEmit  # type check (clean)
npm run lint      # eslint (clean; 1 pre-existing warning in OffersTable)
npx prettier --check .
```

Notable suites: `src/lib/rbac/*.test.ts` (permission matrix, role store, **server enforcement**), `src/lib/mockApiCore.test.ts` (pagination/persistence/ids), `src/lib/formValidation.test.ts`, `src/hooks/useObjectUrl.test.tsx`, `src/lib/mockAdminRole.test.ts`. Vitest runs in `node` env by default; component tests opt into happy-dom via a `// @vitest-environment happy-dom` pragma (see `src/__tests__/rtl-smoke.test.tsx`).

---

## 5. Known caveats / gotchas

- **Mock state resets** on server restart/recompile (in-memory). A real backend must persist roles, offers, conversions, etc.
- **Edge proxy enforces built-in tiers only** — custom roles can't be resolved at the edge (no runtime store there), so they're gated client-side + at the API. This is intentional; documented in `src/proxy.ts`.
- **New `admin/*` mock write routes fail closed** — if a new admin mutation 403s for admin/editor, map it in `requiredWritePermission()` (`mockApiCore.ts`). See the project memory note `mock-api-write-gate`.
- **Cashback approval UI is not role-gated** — the `admin/wallets/*` write routes are API-gated (`users:manage`), but the approval notice + Adjust Wallet panel render for every admin with no `<Can>` / permission guard. Gate the UI behind `super_admin` once that's decided.
- **Next 16 specifics:** middleware is `src/proxy.ts`; `params`/`searchParams` are async; `dynamic` must be a static string literal.
- **ApexCharts:** `postinstall` patches stacked-bar radius; re-run after upgrading and don't set `plotOptions` to `undefined` when toggling chart type.

---

## 6. Suggested next steps / open items

- **Wire a real backend:** replace `/api/mock/*` per entity; keep `src/types/*` in sync; the `requiredWritePermission` map mirrors what the real API should enforce.
- **Persist RBAC roles** server-side (currently in-memory).
- **Low-severity items intentionally left** (see code-review notes): `AddConversionForm` scientific-notation hardening; `get-mycashback-user/:id` positional mapping (mock-only).
- **Stubs to finish:** `CreatePointsForm` / `CreateRewardForm` are alert-only — when wired, add amount validation via `src/lib/formValidation.ts`.
- Consider exposing effective permissions in the JWT so the **edge proxy can enforce custom roles** too.

---

## 7. Doc index

- [`AGENTS.md`](../AGENTS.md) — agent/contributor conventions, where things live, sub-nav patterns.
- [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — tokens, typography, color, components.
- [`docs/RBAC.md`](./RBAC.md) — roles, permission matrix, how to gate.
- [`README.md`](../README.md) — setup, env, deployment.
- `docs/` — API (`api.md`), runbook, code review, and feature plans (insights, policy, deeplink, role access).
- `*_API.md` (root) — per-entity API contracts (admin users, users, offers).
