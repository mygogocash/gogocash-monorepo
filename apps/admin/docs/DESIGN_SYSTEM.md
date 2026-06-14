# Design System — GoGoCash Admin

The single source of truth for design tokens is **`src/app/globals.css`** (Tailwind CSS v4 `@theme` block). This doc explains how those tokens are used in practice so a new contributor (human or AI) can build screens that match the rest of the app. When in doubt, read `globals.css` and grep an existing component — every pattern below is taken from real code.

> Base template: this UI started from **TailAdmin** (Next.js). Conventions below reflect how the GoGoCash team has used/extended it.

---

## 1. Foundations

- **Framework:** Tailwind CSS v4. Tokens are CSS variables under `@theme` and are consumed as normal Tailwind utilities (`bg-brand-500`, `text-title-sm`, `shadow-theme-md`, `xsm:flex`, …).
- **Font:** `Outfit` (`--font-outfit`), applied to `<body>` via `font-outfit`. Body default: `font-normal … bg-gray-50`.
- **Dark mode:** class-based. A `.dark` class on `<html>` toggles it (`@custom-variant dark (&:where(.dark, .dark *))`). **Always pair light + dark utilities** (e.g. `text-gray-800 dark:text-white/90`). Theme state lives in `src/context/ThemeContext.tsx`; toggles in `src/components/common/ThemeToggleButton.tsx`.

### Breakpoints (custom — note the extras)

| Token  | Width  | Notes                                                        |
| ------ | ------ | ------------------------------------------------------------ |
| `2xsm` | 375px  | small phones                                                 |
| `xsm`  | 425px  | **project-specific** — use this, not Tailwind's default `xs` |
| `sm`   | 640px  |
| `md`   | 768px  |
| `lg`   | 1024px |
| `xl`   | 1280px |
| `2xl`  | 1536px |
| `3xl`  | 2000px | ultra-wide                                                   |

---

## 2. Typography

Two scales coexist: **`title-*`** (display/marketing sizes) and **`theme-*`** (UI text), alongside Tailwind's default `text-*`.

| Token                              | Size / line-height | Typical use                                             |
| ---------------------------------- | ------------------ | ------------------------------------------------------- |
| `text-title-2xl` → `text-title-sm` | 72/90 → 30/38      | Big display numbers, hero stats                         |
| `text-theme-xl`                    | 20/30              | emphasis text                                           |
| `text-theme-sm`                    | 14/20              | **default UI text** (menu items, table cells, tooltips) |
| `text-theme-xs`                    | 12/18              | captions, meta, badges                                  |

### Practical roles (copy these class strings)

- **Page title** (`<PageBreadcrumb>`): `text-xl font-semibold text-gray-800 dark:text-white/90`
- **Section / hero header** (dashboard sections): `text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl`
- **Card title**: `text-lg font-semibold tracking-tight text-gray-900 dark:text-white` (or, lighter, `text-base font-medium text-gray-800 dark:text-white/90`)
- **KPI / big stat number**: `text-title-sm font-bold text-gray-800 dark:text-white/90`
- **Subtitle / helper text**: `text-sm text-gray-500 dark:text-gray-400`
- **Label**: `text-sm font-medium text-gray-700 dark:text-gray-300`
- **Button text**: `text-sm font-medium` (see Button component)

---

## 3. Color

Defined as full 25→950 ramps in `globals.css`. Primary families:

- **`brand`** — primary action color. `brand-500 = #465fff`. Buttons, active nav, links, focus ring.
- **`gray`** — neutrals for text/surfaces/borders. `gray-800/900` text on light; `white/90` text on dark. Extra `gray-dark = #1a2231` for dark surfaces.
- **Semantic:** `success` (green), `error` (red), `warning` (amber), `orange` (the “INTERNAL USE ONLY” banner accent), `blue-light`. Each has a 25→950 ramp; use `-50/-100` backgrounds with `-600/-700/-800` text for badges.
- **Accents:** `theme-pink-500`, `theme-purple-500`.

**Surfaces (dark mode):** cards use `bg-white` / `dark:bg-white/[0.03]`; borders `border-gray-200` / `dark:border-gray-800`; page bg `bg-gray-50` / `dark:bg-gray-900`.

Role-badge color helper (RBAC): `roleBadgeClass(id)` in `src/lib/rbac/roles.ts`.

---

## 4. Elevation, radius, spacing, z-index

- **Radius:** controls/buttons/inputs `rounded-lg`; cards `rounded-2xl`; pills `rounded-full`.
- **Shadows:** `shadow-theme-xs|sm|md|lg|xl` (token-based), plus `shadow-focus-ring` (`0 0 0 4px rgba(70,95,255,.12)`) for focus states.
- **Z-index scale:** `z-1, z-9, z-99, z-999, z-9999, z-99999, z-999999` (use these instead of arbitrary values; modals/dropdowns rely on them).

---

## 5. Canonical patterns

### Card shell (used in ~28 components)

```
rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
```

Inner padding is usually `px-4 py-4 sm:px-6 sm:py-5`.

### Button (`src/components/ui/button/Button.tsx`)

- Props: `size` `"sm" | "md"`, `variant` `"primary" | "outline"`, `startIcon`/`endIcon`, `disabled`.
- Primary: `bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300`; Outline: white/ring-gray-300. All `rounded-lg font-medium text-sm`.

### Sidebar menu utilities (`globals.css`)

`menu-item`, `menu-item-active`, `menu-item-inactive`, `menu-item-icon*`, `menu-dropdown-*` — reuse these for any nav surface so active/hover states stay consistent.

### Scrollbars & motion

- `custom-scrollbar` (thin, theme-colored) / `no-scrollbar`.
- Page enter animation: `page-transition-enter` / `page-transition-enter-fade`.

### Images

Never hand-roll image fallbacks: use `pathImage()` (`src/utils/helper.ts`) for URLs and `<RemoteOrBlobImage>` (`src/components/common/`) for previews. For object URLs from `File`s, use the `useObjectUrl` hook (`src/hooks/useObjectUrl.ts`) — never `URL.createObjectURL` inline in render (leaks).

---

## 6. Shared component inventory

**`src/components/ui/`** — primitives: `alert`, `avatar`, `badge`, `button`, `dropdown`, `images`, `modal`, `table`, `video`, `CopyButton`, `StatusTag`.

`StatusTag` (`src/components/ui/StatusTag.tsx`) wraps `STATUS_BADGE_BASE` (see §6.1) — pass per-status color classes via `className`; children are the status text.

**`src/components/ui/button/`** — design-system buttons (no barrel; import each directly). All fixed-height, flexible-width:
| Component | Shape |
|---|---|
| `PrimaryButton` | 44px (`h-11`), `px-4`. `variant`: `default` (white outline + shadow), `blue` (brand-filled), `outline` (white fill + 2px `brand-500` border) |
| `SecondaryButton` | 36px (`h-9`), `px-3`. `variant`: `default` / `blue` |
| `SupportButton` | 28px (`h-7`), `text-xs` outline, rendered as a Next `Link` (also exports `SUPPORT_BUTTON_CLASS` for native `<button>`s, e.g. pagination) |
| `TextButton` | 36px borderless brand-blue text-link (inline actions) |
| `SearchBar` | 36px compact `text-xs` text input (`min-w-[200px]`) |
| `SortByDropdown` | 36px compact `text-xs` `<select>` (`min-w-[124px]`) |

**`src/components/common/`** — app building blocks:
| Component | Purpose |
|---|---|
| `PageBreadCrumb` | Page title + breadcrumb row |
| `ComponentCard` / `Card` | Card containers. **Note:** `ComponentCard` is a TailAdmin demo wrapper (renders a hardcoded sample table) — use the §5 card shell for real features. See `COMPONENTCARD_USAGE.md` |
| `SectionTabs` | Reusable underlined sub-nav tab row (used by Users/Admin management tabs) |
| `ChartTab` | Day/Week/Monthly/Quarterly/Annually chart toggle |
| `AdminPaginationBar` | Standard list pagination |
| `AdminTableSkeleton` | Loading state for tables |
| `AdminQueryError` | Standard error state for queries |
| `SearchTable` | Search input for tables |
| `NoData` | Standard empty-state placeholder (dashed box, "No Data" headline + optional subtext) |
| `StackedDateTime` | Two-line table cell: `dd/mm/yyyy` date over a lighter 24-hour time (invalid/empty → "—") |
| `RemoteOrBlobImage` | Image that handles remote URLs + blob previews |
| `ThemeToggleButton` | Light/dark toggle |
| `GridShape` | Decorative background |

### 6.1 Formatting conventions (always use these helpers)

- **Dates** render `dd/mm/yyyy` via `src/lib/dateFormat.ts` (`formatDate`, `formatMonthYear`, `formatTime`, `formatDateTime` — all 24-hour, invalid/empty → `—`). Never `toLocaleDateString` inline.
- **Money** shows the ISO currency code as a suffix (e.g. `149 THB`), never a symbol (฿/$), via `formatMoney(amount, currency)` in `src/lib/currencyFormat.ts`.
- **Status badges** share one shape/size from `STATUS_BADGE_BASE` (`src/lib/statusBadge.ts`, a rounded-rect `text-xs` pill) and differ only by color; render via `StatusTag` or `${STATUS_BADGE_BASE} ${colorClasses}`. Cycle/tier badges stay `rounded-full` pills.
- **`Switch`** (`src/components/form/switch/Switch.tsx`) accepts an optional `activeLabelClassName` to recolor the label text while checked (e.g. `text-brand-500`).

---

## 7. Adding a new page/section (checklist)

1. Route under `src/app/(admin)/(others-pages)/<name>/page.tsx`.
2. Top of page: `<PageBreadcrumb pageTitle="…" />`.
3. If the section has siblings, add a `SectionTabs` row (mirror the sidebar — see the sub-nav pattern in `AGENTS.md`).
4. Wrap content in the **card shell** above; use the typography roles in §2.
5. Add a sidebar entry in `src/layout/AppSidebarContent.tsx` (gate it with a `permission` if access-controlled — see `docs/RBAC.md`).
6. Add the route's view permission to `ROUTE_VIEW_PERMISSION` in `src/lib/rbac/permissions.ts` if it should be access-gated.
7. Pair every color/utility with its `dark:` variant.
