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

## Data sources

- README describes this build as **mock-heavy**: many flows use **`/api/mock`** and fixtures under `src/app/api/mock/` (e.g. `data.ts`) with routing helpers in `src/lib/mockApiCore.ts`.
- When wiring real backends, keep types in `src/types/` in sync with payloads and update both list and detail/form components for the same entity.

## Where things live

| Area | Location |
|------|-----------|
| App routes & layouts | `src/app/` — `(admin)` = shell + sidebar; `(full-width-pages)` = auth, etc. |
| Sidebar menu items | `src/layout/AppSidebarContent.tsx` (`navItems`, `othersItems`) |
| Admin chrome | `src/layout/AppHeader.tsx`, sidebar components in `src/layout/` |
| Feature UI | `src/components/<feature>/` |
| Shared UI | `src/components/common/`, `src/components/ui/` |
| Server/client providers | `src/components/providers/ClientProviders.tsx` |
| Theme / sidebar state | `src/context/` |
| Mock merchant logos (offers / pending queue) | `public/images/merchant-logos/` — referenced by `pathImage()` and `src/app/api/mock/data.ts` / `src/data/mockPendingOffers.ts` |

### Cross-page sub-navigation (pattern)

Several sections use a **shared top tab row** under the breadcrumb, mirroring sidebar entries:

- **Conversion:** `src/components/conversion/ConversionSubNav.tsx` — lists use `/conversion` and `/conversion?tab=created`; add flow at `/conversion/add`. `ConversionPageClient` reads `tab` from the query string.
- **Banner:** `src/components/banner/BannerSubNav.tsx` on `/banner`, `/banner/modal-popups`, `/banner/popup-history`.
- **Coupon:** `src/components/coupon/CouponSubNav.tsx` on `/coupon`, `/coupon/history`.
- **Quest:** `src/components/quest/QuestSubNav.tsx` on `/quest`, `/reward`.

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
- Run **`npm run lint`** (and fix new issues) after substantive edits.
- Do **not** commit generated artifacts such as `.open-next/` unless the project explicitly requires it.
- **Documentation:** Update `README.md` when user-facing routes or setup change materially; avoid new markdown files unless the user asks.

## Deeper reference

- [`README.md`](./README.md) — routes, env vars, provider stack, deployment.
- [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md) — review checklist and technical notes.
- Other plans and runbooks under [`docs/`](./docs/).

## Related repos (human context)

Backend and mobile app contracts may live in sibling repos (see README **Related Repositories**). This admin UI should stay aligned with those APIs when moving beyond mock data.
