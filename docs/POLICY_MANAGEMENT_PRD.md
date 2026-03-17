# Policy Management – Product Requirements

**Feature:** Admins manage terms and conditions for each category from the Policy Management screen.

**Version:** 1.0  
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose

- Give **admins** a single place to view and edit **terms and conditions (T&C)** that apply **per category** (e.g. Shopping, Travel, Food & Drink).
- Ensure users see the correct legal/policy text when they interact with offers or content in a given category.

### 1.2 Scope

- **In scope:** Admin UI to list categories, view and edit T&C per category, and (when backend exists) persist and serve that content.
- **Out of scope (for this PRD):** User-facing display of T&C in the app, versioning/audit history, multi-language T&C (can be added later).

---

## 2. User Role

| Role    | Access |
|--------|--------|
| Admin  | Full access: list categories, view and edit terms and conditions for each category. |

Only users who can access the GoGoCash Admin dashboard and the “Policy Management” menu item (under Offers Management) can manage policies.

---

## 3. Functional Requirements

### 3.1 List categories and their policies

- **FR-1** The Policy Management page MUST show a list of all **categories** (same source as Category Management, e.g. from the category API).
- **FR-2** For each category, the admin MUST be able to see:
  - Category name (and optionally image/icon if available).
  - Whether terms and conditions are set (e.g. “Set” / “Not set” or a short preview).
  - A clear action to “View / Edit” that category’s T&C.

### 3.2 View terms and conditions per category

- **FR-3** The admin MUST be able to open a view (page or modal) that shows the **current terms and conditions** for a selected category.
- **FR-4** If no T&C exist for that category, the UI MUST show an empty state and an option to “Add terms and conditions”.

### 3.3 Edit terms and conditions per category

- **FR-5** The admin MUST be able to **create or update** the terms and conditions for a category.
- **FR-6** The editor MUST support **plain text or rich text** (e.g. paragraphs, line breaks, optional basic formatting). Exact format (plain vs rich) can be decided in design; minimum is multi-line text.
- **FR-7** The admin MUST be able to **save** changes; the UI MUST show success or error feedback.
- **FR-8** The admin MAY **clear** T&C for a category (leave it empty), with a confirmation step to avoid accidental removal.

### 3.4 Validation and constraints

- **FR-9** If a maximum length for T&C is defined (e.g. by backend), the UI MUST enforce it and show remaining characters.
- **FR-10** Required fields (e.g. category selection) MUST be validated before save; errors MUST be shown inline or in a summary.

---

## 4. Data Model (Conceptual)

- **Category**  
  - Same as in Category Management: e.g. `_id`, `name`, `image`, `createdAt`, `updatedAt`.

- **Policy / Terms and conditions (per category)**  
  - **Category reference:** Link to one category (e.g. `categoryId` or `category_id`).
  - **Content:** The T&C text (plain or rich) for that category.
  - **Timestamps:** Optional `updatedAt` / `updatedBy` for audit.

Backend may model this as:

- A separate “policy” or “terms” resource with `categoryId` + `content`, or  
- A field on the category entity (e.g. `termsAndConditions` or `policy_text`).

The admin UI should align with whatever API the backend exposes (e.g. `GET/PUT /policy?categoryId=...` or `PATCH /category/:id` with a `termsAndConditions` field).

---

## 5. UI/UX Requirements

### 5.1 Policy Management entry

- **UX-1** Policy Management MUST be available under **Offers Management** in the sidebar (already added).
- **UX-2** The main Policy Management page MUST have a clear title and breadcrumb (e.g. “Policy Management”).

### 5.2 List view

- **UX-3** Categories MUST be shown in a table or card list with columns/fields: Category name, T&C status (or preview), Actions (View/Edit).
- **UX-4** Search or filter by category name SHOULD be supported if the list is long.

### 5.3 Edit experience

- **UX-5** Edit MAY be inline (e.g. expandable row), in a slide-over panel, or on a separate page; design to be confirmed.
- **UX-6** Save and Cancel (or “Discard”) MUST be clearly available; unsaved changes SHOULD be confirmed before leaving.

### 5.4 Empty and error states

- **UX-7** If there are no categories, show an empty state with a short explanation.
- **UX-8** If loading or save fails, show a clear error message and, where possible, a retry or link back to the list.

---

## 6. Acceptance Criteria (Summary)

- [ ] Admin can open Policy Management from the sidebar (Offers Management → Policy Management).
- [ ] Admin sees a list of all categories with an indication of whether T&C are set.
- [ ] Admin can open the T&C view/editor for a chosen category.
- [ ] Admin can create or update the terms and conditions text for that category and save.
- [ ] Admin can clear T&C for a category with confirmation.
- [ ] Success and error feedback are shown on save.
- [ ] Validation (and optional max length) is applied before save.

---

## 7. API Assumptions (for implementation)

- **Categories:** Reuse existing category list API (e.g. same as Category Management).
- **Policies:** Either:
  - `GET /policy?categoryId=:id` and `PUT /policy` (body: `categoryId`, `content`), or  
  - `GET /category/:id` and `PATCH /category/:id` with `{ termsAndConditions: "..." }`.

Until the backend is defined, the UI can be built with mock data keyed by `categoryId` and later wired to the real API.

---

## 8. Future Enhancements (out of scope for v1)

- Version history / audit log of T&C changes.
- Multi-language terms per category.
- User-facing screen in the app that displays T&C by category (e.g. when user taps “Terms” for an offer in a given category).
- Rich text formatting (bold, lists, links) if only plain text is supported in v1.
