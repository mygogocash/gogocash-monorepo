# Deeplink page — cleaner UI plan

Targets [`src/components/deeplink/DeeplinkTable.tsx`](src/components/deeplink/DeeplinkTable.tsx).

> **Current architecture (verified):** there is no standalone Deeplink page anymore.
> [`src/app/(admin)/(others-pages)/deeplink/page.tsx`](src/app/(admin)/(others-pages)/deeplink/page.tsx)
> is now a `redirect("/brands?tab=deeplink")`. `DeeplinkTable` renders as the
> **User tracking link** tab inside Brands Management
> ([`src/components/offer/OffersManagementPageContent.tsx`](src/components/offer/OffersManagementPageContent.tsx)),
> which already owns the single `PageBreadcrumb`. So the breadcrumb / page-shell
> items below are owned by that tabbed shell, not by a deeplink page.

---

## 1. Problems today (from current markup)

The breadcrumb-duplication problems below were resolved by moving Deeplink under
the Brands Management tab shell (one `PageBreadcrumb`, no duplicate page title).
What remains live in `DeeplinkTable.tsx`:

| Issue | What users see / feel |
|--------|----------------------|
| **Mixed-case headers** | `USER ID` / `EMAIL` are ALL CAPS while the rest (`Source`, `Offer / shop / brand`, `Tracking link`, `Click`, `Create Date`, `Update Date`) are sentence/title case — inconsistent within one header row. |
| **Dense table** | Eight columns; long IDs and tracking links compete for attention; horizontal scroll below `min-w-[820px]`. |
| **Link-only tracking link** | URL is a clickable link (truncated + `title` tooltip) but there is no quick **copy** action (common ops workflow). |

> Already handled in the table: a card title (`h3` **Tracking link records**),
> a `Total: N` count line (with "filtered from M" when searching), a search box,
> and a `NoData` empty state. Row click opens a read-only detail `Modal`.

---

## 2. Goals

- **One clear page title** and a **minimal breadcrumb** (e.g. Home → Deeplink).
- **Scannable table**: calmer headers, better column priority, less visual noise.
- **Faster tasks**: search stays; add copy-to-clipboard and optional filters.
- **Consistent** with other admin pages (see Banner’s breadcrumb simplicity; optional parity with DataGrid where it helps).

---

## 3. Phase A — Information architecture (quick win)

> **Status: largely done.** The breadcrumb now lives in the Brands Management tab
> shell (`OffersManagementPageContent.tsx` → single `PageBreadcrumb`), and the
> table title (`h3` **Tracking link records**) no longer repeats a page title.
> Remaining optional polish:

1. Optionally add a **one-line description** under the `PageBreadcrumb` title area (if you extend the component or add a small wrapper) — e.g. “View and search user tracking links by offer and activity.”
2. Optionally reconsider the inner `h3` title now that Deeplink is a tab — e.g. drop it and rely on the active tab label + toolbar row (search + count).

**Acceptance:** User reads the section once at the top; the tab shell owns one breadcrumb.

---

## 4. Phase B — Table readability

1. **Headers**: switch the ALL-CAPS `USER ID` / `EMAIL` to **sentence case** so the whole header row is consistent — current columns are `User ID`, `Email`, `Source`, `Offer / shop / brand`, `Tracking link`, `Click`, `Create Date`, `Update Date` (match design tokens used elsewhere).
2. **Column widths**: set sensible `min-w` / `max-w` per column; keep **User ID** monospace but shorten visible width with **tooltip** on hover (already done via `title` + `max-w-[180px]` truncation — align all truncations).
3. **Tracking link column**: show **truncated host + path** in cell; full URL in tooltip (already truncates + has `title`); add primary actions: **Open** (icon link) + **Copy** (icon button with toast or brief “Copied”).
4. **Dates**: use one format (ISO or locale) consistently; optional **relative** sublabel for “last 24h” teams (low priority).
5. **Clicks**: right-align numbers; consider **thousands separator** for large values later.
6. **Sticky header** on scroll (within card): `sticky top-0 z-10 bg-white dark:bg-gray-900` on `thead` for long lists.

**Acceptance:** First scan shows **who / what offer / how many clicks** without reading full Mongo IDs.

---

## 5. Phase C — Toolbar and empty states

1. **Toolbar row**: group **search** (full width on mobile) with optional **Offer** filter (`select` from distinct `offerName` in data or API later).
2. **Count badge**: show `Total: N` as a compact pill next to the toolbar title instead of duplicating a paragraph under a second heading.
3. **Empty search**: keep current message; add illustration or icon only if the design system already uses one elsewhere.
4. **Loading / error** (when wired to API): skeleton rows or spinner in table body; inline error with retry.

---

## 6. Phase D — Optional: DataGrid alignment

If product wants **sorting, column resize, pagination** like Offer/Withdraw:

- Replace or wrap the custom `Table` with **MUI `DataGrid`** (lazy-loaded `dynamic` import) and shared `sx` patterns from [`withdrawDataGridSx`](src/components/withdraw/withdrawDataGridSx.ts) / coupon grid.
- Pros: built-in sort, page size, column hide. Cons: bundle size; must match dark mode styling.

**Decision:** Only if lists exceed ~50 rows regularly or PM asks for export/sort.

---

## 7. Phase E — API and a11y (when leaving mock data)

1. Replace `MOCK_DEEPLINKS` with React Query + API types; preserve search/filter as client-side or server query params.
2. Table: `scope="col"` on headers if staying on native table; keyboard focus for copy buttons; `aria-label` on icon-only actions.

---

## 8. Implementation checklist (suggested order)

- [x] **A1** Breadcrumb owned by the Brands Management tab shell (`page.tsx` now redirects to `/brands?tab=deeplink`).
- [ ] **A2** (optional) Reword/remove the `h3` in `DeeplinkTable` now that it's a tab.
- [ ] **B1** Sentence-case headers + alignment tweaks.
- [ ] **B2** URL column: truncate + copy + open.
- [ ] **B3** Sticky table header inside card.
- [ ] **C1** Toolbar layout (search + count pill + optional offer filter).
- [ ] **D** DataGrid (optional, behind decision).
- [ ] **E** Real data + a11y pass.

---

## 9. Files likely touched

| File | Changes |
|------|---------|
| `src/components/deeplink/DeeplinkTable.tsx` | Toolbar, headers, tracking-link actions, sticky thead, filters |
| `src/components/offer/OffersManagementPageContent.tsx` | Breadcrumb items / tab labels; optional page description block (owns the shell now) |
| `src/components/common/PageBreadCrumb.tsx` | Only if adding optional subtitle prop project-wide |
| `src/app/(admin)/(others-pages)/deeplink/page.tsx` | Redirect-only today; touch only if the URL/redirect target changes |

This keeps scope focused on **clarity and hierarchy** first; **DataGrid** and **API** are optional follow-ups.
