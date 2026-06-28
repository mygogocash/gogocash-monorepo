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
- Prefer **real API** (`NEXT_PUBLIC_API_URL`) over mock when verifying admin Brands Management changes on the customer app.
- Use **24-hour English time** in admin date/time pickers (flatpickr `HH:mm` + native `type=time`); do not show AM/PM.
- Surface **real API error messages** in admin forms/toasts via `getApiErrorMessage()` — avoid generic “Save failed” when the API returns a specific reason.
- Stay on **MongoDB Atlas** for database infrastructure — do not plan GCP Cloud SQL/Firestore migration unless explicitly requested.
- Involve Asia postback URL in the affiliate portal must be a **plain HTTPS URL** with `{macros}` — never paste a `curl` command or shell syntax into the postback field.

## Learned Workspace Facts

- Sidebar: first item is **Platform Dashboard** → `/dashboard` (`src/layout/AppSidebarContent.tsx`). **`/executive`** may still exist as a route even when it is not linked in the sidebar.
- **Statistics** dashboard chart: `src/components/ecommerce/StatisticsChart.tsx` — four series (Clicks, Conversions, Sale amount, Estimated earnings), optional chart kinds (column / stacked column / line). For ApexCharts, **do not set `plotOptions` to `undefined`** when toggling types; that wipes defaults and can throw (`reading 'line'`). Use conditional object spread or explicit `plotOptions.line` for line mode.
- **`ChartTab`** (`src/components/common/ChartTab.tsx`): tabs include Day, Week, Monthly, Quarterly, Annually; supports controlled `value` / `onChange` — wire those props when the chart should follow the tab selection.
- If the dev server uses **3001** because **3000** is taken, align **`NEXTAUTH_URL`** in `.env.local` with the actual origin (see README / `npm run dev:3001`). Staging Cloud Run **`gogocash-admin`** also needs `NEXTAUTH_URL` + `NEXTAUTH_SECRET` (Secret Manager) or `/api/auth/*` returns a server error on sign-in.
- **Next.js 16:** `params` and `searchParams` are async; client `page`/`layout` components that receive them may need **`React.use()`** or a thin async server wrapper to avoid dev enumeration warnings (see Next.js “sync dynamic APIs” message).
- Without **`NEXT_PUBLIC_API_URL`** in `.env.local`, admin uses in-memory **`/api/mock`** (offer ids like `o1`, `o2`); set `https://api-staging.gogocash.co` or `http://localhost:8080` to match the customer app for real E2E. Mock sign-in (`admin@gogocash.co` / `1234`) is disabled when a real API URL is set. **Local UI + staging data:** point at `https://api-staging.gogocash.co` — no local Mongo/API required. **Hosted staging:** `https://admin-staging.gogocash.co` + `https://api-staging.gogocash.co`. Coupon create/update POSTs **JSON** to `/offer/update-coupon`; partial writes fail the global **`ValidationPipe`** unless omitted DTO fields are **`@IsOptional()`**.
- **MongoDB Atlas:** prod cluster **`gogocash`** (~3.15 GB, M10 dedicated); staging **`gogocash-staging`** (M0 free, **512 MB max**) — a full prod backup will not fit staging M0; use partial **`mongorestore`** (e.g. `users`) or local Docker **`gogocash-mongo`**. Atlas snapshot restore to shared/M0 is blocked — download prod backup and `mongorestore --uri=<staging-uri>/gogocash` (GCP secrets: `gogocash-production-mongo-uri`, `gogocash-staging-mongo-uri`).
- After prod→staging Mongo clone: **Firebase stays staging-only** — user documents may match in **GoGoCash Users**, but customer OTP login may not behave like prod.
- **All admin media uploads** (banner home, brand logos, categories, quests, withdraw slips, missing-order attachments) use **GCS** via `StoredMediaService` (`apps/api/src/media/`). Legacy Google Drive file ids still render and delete on replace. Local API needs `GOOGLE_APPLICATION_CREDENTIALS`; Drive OAuth (`GOOGLE_*`) is only needed for legacy delete/stream until data is migrated. See `apps/admin/docs/GCS_MEDIA_MAINTENANCE_PLAN.md`.
- **Quest campaigns:** create/save requires **super_admin** (API rejects editors with `quest:manage`). **Admin team vs customers:** invite admins via **Users Admin** (`/admin-users`); **GoGoCash Users** (`/users`) lists customer app accounts.
- **Top brands** (`TopBrandManagementPanel`): reorder/cashback edits are draft until **Save top brands** (`PUT /admin/top-brands`); public `GET /offer/top-brands` drops disabled offers even if they remain in the admin list.
- **Involve Asia + API DI:** postbacks `GET /involve/postback?token=` (`INVOLVE_POSTBACK_SECRET`, separate from `INVOLVE_SECRET`; fail-closed when unset); brand sync uses `INVOLVE_SECRET`. Nest modules must import `PointModule`/`InvolveModule` for `PointService`/`JobService` — never re-register those providers (Cloud Run `UnknownDependenciesException`).
