# Agent guide — GoGoCash Admin

Concise context for coding agents working in this repository. For full setup, architecture, and deployment, read [`README.md`](./README.md) first.

## Project

- **Name:** `gogocash-admin` — internal Next.js admin dashboard for GoGoCash.
- **Package manager:** `npm` (see `packageManager` in `package.json`).
- **Default branch workflow:** Team often uses **`staging`**; align with README git notes before pushing.

## Stack

- **Framework:** Next.js App Router (see `next` in `package.json` for exact version).
- **UI:** React, TypeScript, Tailwind CSS 4, Material UI (Data Grid and some admin tables), ApexCharts, FullCalendar.
- **ApexCharts:** `postinstall` runs `scripts/patch-apexcharts-border-radius.mjs` so stacked bar radius options behave as expected. After upgrading the `apexcharts` package, re-run `npm install` (or the script manually) and smoke-test bar charts (statistics + any stacked series); if the patch fails to apply, the script logs a warning and may need updating for the new bundle layout.
- **Data fetching:** TanStack React Query (`src/lib/query/`), Axios client (`src/lib/axios/`, `src/hooks/useApi.ts`).
- **Auth:** NextAuth v4 (Credentials → JWT). Local mock sign-in is documented in README (`admin@gogocash.co` / `1234` when using mock flow).
- **RBAC:** tiered **and dynamic** roles — built-ins `super_admin`/`admin`/`editor`/`viewer` plus custom roles created at runtime in **Role Management** (`/roles`). Gates UI, routes (`src/proxy.ts`), and the API; every non-GET mock route is permission-gated in `mockApiCore.ts` (`requiredWritePermission`, **fail-closed** for unmapped `admin/*` writes). Logic in `src/lib/rbac/`; gate UI with `usePermissions()` / `<Can>`. Demo roles by signing in as `viewer@…` / `editor@…` / `operator@…` (password `1234`). See [`docs/RBAC.md`](./docs/RBAC.md).

## Data sources

- README describes this build as **mock-heavy**: many flows use **`/api/mock`** and fixtures under `src/app/api/mock/` (e.g. `data.ts`) with routing helpers in `src/lib/mockApiCore.ts`.
- When wiring real backends, keep types in `src/types/` in sync with payloads and update both list and detail/form components for the same entity.

## Where things live

| Area                                         | Location                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| App routes & layouts                         | `src/app/` — `(admin)` = shell + sidebar; `(full-width-pages)` = auth, etc.                                                    |
| Sidebar menu items                           | `src/layout/AppSidebarContent.tsx` (`navItems`, `othersItems`)                                                                 |
| Admin chrome                                 | `src/layout/AppHeader.tsx`, sidebar components in `src/layout/`                                                                |
| Feature UI                                   | `src/components/<feature>/`                                                                                                    |
| Shared UI                                    | `src/components/common/`, `src/components/ui/`                                                                                 |
| Server/client providers                      | `src/components/providers/ClientProviders.tsx`                                                                                 |
| Theme / sidebar state                        | `src/context/`                                                                                                                 |
| Mock merchant logos (offers / pending queue) | `public/images/merchant-logos/` — referenced by `pathImage()` and `src/app/api/mock/data.ts` / `src/data/mockPendingOffers.ts` |

### Cross-page sub-navigation (pattern)

Several sections use a **shared top tab row** under the breadcrumb, mirroring sidebar entries:

- **Conversion:** `src/components/conversion/ConversionSubNav.tsx` — lists use `/conversion` and `/conversion?tab=created`; add flow at `/conversion/add`. `ConversionPageClient` reads `tab` from the query string.
- **Banner:** `src/components/banner/BannerSubNav.tsx` on `/banner`, `/banner/all-brand-page`, `/banner/modal-popups`, `/banner/popup-history`.
- **Coupon:** `src/components/coupon/CouponSubNav.tsx` on `/coupon`, `/coupon/history`.
- **Quest:** `src/components/quest/QuestSubNav.tsx` on `/quest`, `/reward`.
- **Brands:** `src/components/offer/OffersManagementPageContent.tsx` — tabs include Create brand (`/brands/create-brand`), `/brands`, `commission`, `policy`, user tracking link (`?tab=deeplink`), `top-brands`.

When adding a new sidebar subsection, consider the same pattern for consistency.

## Commands

```bash
npm install
npm run setup:local    # .env.local from .env.example if missing
npm run dev            # http://localhost:3000
npm run lint
npm run build
```

## Conventions for agents

- Prefer **small, task-scoped diffs**; match existing naming, imports, and Tailwind patterns in touched files.
- **Formatting conventions:** render user-facing dates as **dd/mm/yyyy** via `src/lib/dateFormat.ts` (`formatDate` / `formatDateTime`); show money with the **ISO currency code as a suffix** (e.g. `149 THB`), never a symbol, via `src/lib/currencyFormat.ts` (`formatMoney`); status badges share a rounded-rect base from `src/lib/statusBadge.ts` (cycle/tier badges stay rounded-full pills).
- Run **`npm run lint`** (and fix new issues) after substantive edits.
- Do **not** commit generated artifacts such as `.open-next/` unless the project explicitly requires it.
- **Documentation:** Update `README.md` when user-facing routes or setup change materially; avoid new markdown files unless the user asks.

## Deeper reference

- [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) — **start here:** current progress, architecture map, caveats, and next steps (handoff doc).
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — design tokens, typography scale, color, and shared component inventory.
- [`docs/RBAC.md`](./docs/RBAC.md) — roles, permission matrix, and how to gate UI/routes/API.
- [`README.md`](./README.md) — routes, env vars, provider stack, deployment.
- [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md) — review checklist and technical notes.
- Other plans and runbooks under [`docs/`](./docs/).

## Related repos (human context)

Backend and mobile app contracts may live in sibling repos (see README **Related Repositories**). This admin UI should stay aligned with those APIs when moving beyond mock data.

## Learned User Preferences

- UI and layout feedback is often anchored to a specific DOM node or browser preview selection; expect iterative, viewport-aware tweaks (modals, dashboard charts, sidebar).
- The primary operational entry should stay **one click** from the sidebar (**Platform Dashboard**), not buried in a submenu.

## Learned Workspace Facts

- Sidebar: first item is **Platform Dashboard** → `/dashboard` (`src/layout/AppSidebarContent.tsx`). **`/executive`** may still exist as a route even when it is not linked in the sidebar.
- **Statistics** dashboard chart: `src/components/ecommerce/StatisticsChart.tsx` — four series (Clicks, Conversions, Sale amount, Estimated earnings), optional chart kinds (column / stacked column / line). For ApexCharts, **do not set `plotOptions` to `undefined`** when toggling types; that wipes defaults and can throw (`reading 'line'`). Use conditional object spread or explicit `plotOptions.line` for line mode.
- **`ChartTab`** (`src/components/common/ChartTab.tsx`): tabs include Day, Week, Monthly, Quarterly, Annually; supports controlled `value` / `onChange` — wire those props when the chart should follow the tab selection.
- Sub-`sm` layout tuning: the project defines **`xsm:`** (425px) in `globals.css`, not Tailwind’s `xs:`.
- Offer editor UI: despite its name, `OfferFullscreenCardShell` now renders the offer edit form (`FormOffer.tsx`) and the pending-review page (`PendingOfferReviewContent.tsx`) as a **content-fit inline card** that flows with the page under the app layout (no fullscreen modal, no inner scroll); it provides the `OfferFormScrollToSection` context used by `FormSectionJumpNav`.
- If the dev server uses **3001** because **3000** is taken, align **`NEXTAUTH_URL`** in `.env.local` with the actual origin (see README / `npm run dev:3001`).
- **`git pull` over HTTPS** may return “repository not found” for private repos without credentials; use a PAT, `gh auth login`, or an SSH remote.
- **Node version:** some tooling may warn **EBADENGINE** on very new Node; prefer **20 or 22** if installs or Firebase-related deps misbehave.
- **Next.js 16:** `params` and `searchParams` are async; client `page`/`layout` components that receive them may need **`React.use()`** or a thin async server wrapper to avoid dev enumeration warnings (see Next.js “sync dynamic APIs” message).
- **Cashback wallet UI** lives in the **Conversions** tab of the user detail page (`/withdraw/:id`, `src/components/withdraw/WithdrawDetail.tsx`): a “Cashback Wallet” section with an **Adjust Wallet** panel (`src/components/wallet/UserWalletPanel.tsx`, freeze/unfreeze + add-extra-cashback) and an inline approval notice (`src/components/wallet/CashbackApprovalNotice.tsx`, Approve / Reject). Adding extra cashback files a **pending** request rather than crediting immediately; approval credits the balance. Mock routes (`POST /admin/wallets/:uid/adjust`, `GET /admin/wallets/:uid`, `PUT .../freeze`|`/unfreeze`, `POST /admin/wallets/cashback-request/:id`) live in `src/lib/mockAdminFeatures.ts` and are write-gated by `users:manage` in `mockApiCore.ts`; the approval UI itself is **not** yet `usePermissions()`/`<Can>`-gated.
