# Deeplink page — cleaner UI plan

Targets [`src/app/(admin)/(others-pages)/deeplink/page.tsx`](src/app/(admin)/(others-pages)/deeplink/page.tsx) and [`src/components/deeplink/DeeplinkTable.tsx`](src/components/deeplink/DeeplinkTable.tsx).

---

## 1. Problems today (from current markup)

| Issue | What users see / feel |
|--------|----------------------|
| **Redundant labels** | Page `h2` says **Deeplink**, breadcrumb repeats **Deeplink Home** and **Deeplink Lists**, and the card title is again **Deeplink Lists** — same idea three times. |
| **Busy breadcrumb** | Four trail segments for a single list page; **Banner** uses a simpler pattern (`pageTitle` + default Home). |
| **Dense table** | Seven columns with **ALL CAPS** headers; long IDs and URLs compete for attention; horizontal scroll on smaller widths. |
| **Weak hierarchy** | No short page subtitle (“Track user deeplinks and clicks”); metrics (total rows) sit only inside the card. |
| **Link-only deeplink** | URL is clickable but there is no quick **copy** action (common ops workflow). |

---

## 2. Goals

- **One clear page title** and a **minimal breadcrumb** (e.g. Home → Deeplink).
- **Scannable table**: calmer headers, better column priority, less visual noise.
- **Faster tasks**: search stays; add copy-to-clipboard and optional filters.
- **Consistent** with other admin pages (see Banner’s breadcrumb simplicity; optional parity with DataGrid where it helps).

---

## 3. Phase A — Information architecture (quick win)

**Page shell (`page.tsx`)**

1. **Simplify breadcrumb** to match Banner-style usage:
   - Either `pageTitle="Deeplink"` with **no** custom `items` (default: Home → Deeplink), **or** `items={[{ label: "Home", href: "/dashboard" }, { label: "Deeplink" }]}` only.
2. Remove duplicate concepts: drop **“Deeplink Home”** and **“Deeplink Lists”** from the trail entirely.
3. Optionally add a **one-line description** under the `PageBreadcrumb` title area (if you extend the component or add a small wrapper) — e.g. “View and search user deeplinks by offer and activity.”

**Card / table header (`DeeplinkTable.tsx`)**

4. Rename inner section title to something that doesn’t repeat the page: e.g. **“All records”**, **“Deeplink activity”**, or remove the `h3` and rely on the page title + toolbar row (search + count).

**Acceptance:** User reads **Deeplink** once at the top; breadcrumb has at most **two** segments after Home.

---

## 4. Phase B — Table readability

1. **Headers**: switch from `USER ID` style to **sentence case** (`User ID`, `Email`, `Offer`, `URL`, `Clicks`, `Created`, `Updated`) for a calmer, more product-like look (match design tokens used elsewhere).
2. **Column widths**: set sensible `min-w` / `max-w` per column; keep **User ID** monospace but shorten visible width with **tooltip** on hover (you already use `title` in places — align all truncations).
3. **URL column**: show **truncated host + path** in cell; full URL in tooltip; primary actions: **Open** (icon link) + **Copy** (icon button with toast or brief “Copied”).
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

- [ ] **A1** Simplify `page.tsx` breadcrumb (remove “Deeplink Home” / “Deeplink Lists” trail).
- [ ] **A2** Remove or reword duplicate `h3` in `DeeplinkTable`.
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
| `src/app/(admin)/(others-pages)/deeplink/page.tsx` | Breadcrumb items; optional page description block |
| `src/components/deeplink/DeeplinkTable.tsx` | Toolbar, headers, URL actions, sticky thead, filters |
| `src/components/common/PageBreadCrumb.tsx` | Only if adding optional subtitle prop project-wide |

This keeps scope focused on **clarity and hierarchy** first; **DataGrid** and **API** are optional follow-ups.
