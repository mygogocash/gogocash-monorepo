# Executive Summary
Complete the top-brands admin-config wiring so the admin panel can load and save the same persisted config consumed by the Expo customer app.

# Business Goals
Let operators curate homepage top brands with display order and cashback copy from the admin panel.

# Technical Goals
Align `GET /admin/top-brands`, `PUT /admin/top-brands`, the admin API client, the admin dev mock, and `TopBrandManagementPanel` on `{ brands: [{ offerId, cashback }] }`.

# Requirements
- `GET /admin/top-brands` returns saved config, not conversion-ranked analytics.
- `PUT /admin/top-brands` persists ordered offer Mongo `_id` values plus cashback labels.
- Admin UI loads saved cashback labels, edits them per row, and saves the ordered `brands` payload.
- Dev mock implements the same request and response shape.

# Non-Goals
- No changes to the public Expo `/offer/top-brands` display endpoint beyond compatibility fixes if needed.
- No new top-brands data model beyond the existing `TopBrandConfig`.
- No production deployment or GitHub publishing in this task.

# Architecture
Admin UI uses `apiClient` to call admin-guarded top-brands endpoints. API persists a singleton `TopBrandConfig` document. Public customer display remains resolved through `OfferService.getDisplayTopBrands()`.

# Data Models
`TopBrandConfig.brands[]` contains `offerId: string` and `cashback: string`.

# API Contracts
- `GET /admin/top-brands` returns `{ order, brands, items }`.
- `PUT /admin/top-brands` accepts `{ brands: [{ offerId, cashback }] }` and returns `{ success, brands }`.

# Security
Keep `GET /admin/top-brands` behind `AuthAdminGuard`. Keep `PUT /admin/top-brands` behind `AuthAdminGuard` plus `@Roles('approver')`.

# Edge Cases
- Empty config returns empty arrays.
- Unknown saved offer IDs are kept in `order`/`brands` for editing visibility but omitted from resolved `items`.
- Duplicate or blank offer IDs are rejected or normalized at the write boundary.

# Testing Strategy
Use Jest for API service/controller behavior and Vitest for admin client/UI/mock behavior where coverage already exists.

# Rollback Plan
Revert the top-brands admin/API/mock/UI changes. Existing Expo fixture mode remains a fallback and public display returns empty data if config is absent.

# Milestones
1. Contract tests: saved-config admin GET and brands PUT.
2. Implementation: API service, admin client, mock, UI cashback input.
3. Verification: targeted tests, typecheck/lint where practical, manual backend-mode checklist.

# Epics
Top-brands admin editor: operators can load, order, annotate, and save homepage top-brand configuration.

# User Stories
As an admin operator, I want to set top-brand order and cashback text, so the customer homepage reflects current merchandising priorities.

# Tasks
- Update API tests and `AdminService.getTopBrands()`.
- Update admin types and `apiClient.saveTopBrands()`.
- Update `TopBrandManagementPanel` state and row UI.
- Update `mockApiCore` GET/PUT behavior.
- Run verification gates and review the diff.

# Acceptance Criteria
- Saved config round-trips through admin API.
- Admin save sends `{ brands }`, not `{ order }`.
- UI shows a cashback input per selected row.
- Dev mock behavior matches real API shape.
- Targeted tests pass or any remaining failures are documented.
