# Executive Summary

Implement admin-managed Quest campaigns, brand task bonuses, leaderboards, and rank rewards. The `quests` document owns the task and reward snapshots for each campaign, while active campaigns mirror enabled task points to `offers.extra_point` so the existing customer Quest page stays compatible.

# Business Goals

Let GoGoCash operators manage which brands appear on the Quest page, choose bonus point values, control ordering, verify brand tracking/deeplink readiness, view leaderboard outcomes, and configure rank rewards from the admin panel.

# Technical Goals

Add `quests.tasks[]` and `quests.rewards[]`, superadmin-only task/reward update APIs, customer `/offer/extra-point` task resolution from open quests, historical leaderboard bonus calculation from campaign snapshots, admin leaderboard reward decoration, and an API-backed admin Quest management UI.

# Requirements

- Admin can edit Quest campaign dates, status, reward status, social links, and banners.
- Superadmin can add, remove, reorder, enable/disable, and set point values for Quest brand tasks.
- Superadmin can configure per-rank Quest rewards for each campaign.
- Admin can view a selected Quest leaderboard with rank, user, total points, and configured reward.
- Public Quest tasks use enabled open-quest tasks ordered by `sort_order`.
- Public task offers exclude disabled, pending review, and rejected merchants.
- If `quests.tasks` is empty, customer task listing falls back to legacy `offers.extra_point > 1`.
- Saving active Quest tasks mirrors enabled task values to `offers.extra_point`; removed/disabled prior task offers are reset to `1`.
- Admin can inspect read-only deeplink summary data for configured Quest brands without exposing user PII.

# Non-Goals

- Do not create universal user deeplinks from admin.
- Do not remove legacy `offers.extra_point` compatibility.
- Do not change customer Quest page UI in this task.
- Do not run production migrations automatically.

# Architecture

`PointService` owns Quest campaign writes, task/reward validation, point snapshot use, leaderboard reward decoration, and deeplink summaries. `OfferService.getOfferExtraPoint()` resolves the customer task list from the current open quest first, then falls back to legacy offer flags. The admin app uses React Query plus the existing axios client to load campaigns, save campaign form data, save task JSON, save reward JSON, fetch leaderboard rows, and fetch deeplink summaries. The payout job prefers `quest.rewards[]` for the target campaign and falls back to the legacy global `rewardlists` document.

# Data Models

`Quest.tasks[]` stores:

- `offer`: Mongo ObjectId ref to `Offer`
- `offer_id`: affiliate network offer id
- `merchant_id`: affiliate network merchant id
- `extra_point`: integer `2..10000`
- `sort_order`: normalized display order
- `enabled`: display/award toggle
- `wording`: optional customer-facing wording override
- `notes`: optional internal note

`Quest.rewards[]` stores:

- `rank`: integer rank position
- `reward`: numeric payout amount
- `currency`: payout currency, default `THB`

# API Contracts

- `GET /point/admin-get-quest` returns campaigns with populated `tasks.offer`.
- `POST /point/create-quest` creates/updates campaign fields and banner files.
- `PATCH /point/admin-quest/:id/tasks` accepts `{ tasks: QuestTaskDto[] }` and requires `@Roles('superadmin')`.
- `PATCH /point/admin-quest/:id/rewards` accepts `{ rewards: QuestRewardDto[] }` and requires `@Roles('superadmin')`.
- `GET /point/admin-quest/:id/task-deeplinks` returns non-PII deeplink summary rows.
- `GET /point/admin-quest/:id/leaderboard` returns admin-only leaderboard rows decorated with the selected Quest's rank rewards.
- `GET /offer/extra-point` returns enabled task offers in quest order, or legacy extra-point offers if no task snapshot exists.

# Security

Task point and rank reward updates are superadmin-only because they change campaign economics. Deeplink summaries intentionally omit user ids, emails, and other PII. Customer-facing task queries filter inactive and unapproved offers.

# Edge Cases

- Duplicate task offers are rejected.
- Duplicate reward ranks are rejected.
- Missing, disabled, pending, or rejected offers are rejected for task saves.
- Empty task lists are allowed and clear active campaign bonus mirrors.
- Empty reward lists are allowed and make the admin leaderboard show zero configured rewards.
- Historical leaderboard requests use the quest snapshot matching the requested date range when available.
- Legacy data without tasks continues to work through `offers.extra_point`.
- Legacy payout data without `quest.rewards[]` continues to work through the global `rewardlists` document.

# Testing Strategy

Use Jest for API service/RBAC contracts and Vitest for admin mock/helper contracts. Run typecheck on both `apps/api` and `apps/admin`.

# Rollback Plan

Revert the Quest task/reward schema/API/UI changes and `/offer/extra-point` task resolution. Since the backfill only adds embedded snapshots and updates active `offers.extra_point` mirrors, rollback can ignore `quests.tasks`/`quests.rewards` and return to legacy `offers.extra_point > 1` plus global `rewardlists`.

# Milestones

1. Backend task contract and tests.
2. Admin UI and local mock wiring.
3. Backfill script and rollout docs.
4. Verification and final audit.

# Epics

Quest campaign editor, Quest task manager, Quest leaderboard, rank reward setup, customer task compatibility, and deeplink readiness visibility.

# User Stories

As an admin operator, I want to choose Quest brands and point values so the customer Quest page reflects the current campaign.

As a superadmin, I want task point edits locked to my role so campaign economics cannot be changed by lower-privilege admins.

As an operator, I want to inspect tracking/deeplink readiness per merchant so I can check campaign links before promoting the Quest.

As an admin operator, I want to view the Quest leaderboard with points and configured rewards so I can validate winners before payout.

As a superadmin, I want to configure rank rewards per Quest so each campaign can have its own payout structure.

# Tasks

- Extend Quest schema and DTOs with task snapshots.
- Extend Quest schema and DTOs with rank reward snapshots.
- Add superadmin-only task/reward save endpoints and deeplink summary endpoint.
- Add admin leaderboard endpoint decorated with Quest rank rewards.
- Update public extra-point and leaderboard bonus resolution.
- Update payout job to prefer per-Quest rewards with legacy fallback.
- Replace mock Quest table with API-backed campaign/task management.
- Add leaderboard and reward setup sections to the admin Quest table.
- Add mock API support and tests.
- Add one-time active Quest backfill script.

# Acceptance Criteria

- Targeted API tests pass for task validation, mirroring, public ordering, and RBAC.
- Admin tests pass for task payload ordering/validation and mock round-trip.
- `apps/api` and `apps/admin` typechecks pass.
- Admin can save a campaign and active Quest task list.
- Admin can view Quest leaderboard rows with rank, points, and reward.
- Superadmin can save per-rank Quest rewards.
- Customer `/offer/extra-point` returns configured Quest tasks in admin order.
- Payout job uses per-Quest rewards when present and legacy global rewards when absent.

---

# Banner Management Addendum

# Executive Summary

Wire homepage banner slots end to end so Banner Management is the source of truth for customer homepage banners. Admins can update each slot's image, link, visibility switch, and schedule; the customer app renders only currently active slots and keeps fixture fallback when no active admin banners exist.

# Business Goals

Let GoGoCash operators run homepage banner campaigns without code changes, including planned launches, expirations, hidden slots, and campaign links.

# Technical Goals

Persist per-slot banner controls in the API, pass them through the admin multipart update contract, expose them through `GET /offer/banner-home`, and make the customer app filter slots by enabled state and schedule before rendering.

# Requirements

- Admin can edit each homepage banner slot independently.
- Each slot supports image, link, enabled/hidden state, optional start date, and optional end date.
- Public customer homepage shows only enabled slots with active schedules.
- Customer banners keep slot ordering and placement rules: slots 1-3 are main banners, slots 4-5 are side banners.
- If no active backend banner is available, the customer app keeps its existing local fallback banners.
- Existing legacy documents with only `image_N` and `link_N` continue to render.

# Non-Goals

- Do not redesign the customer homepage banner layout.
- Do not remove legacy document-wide `start_date` and `end_date` compatibility.
- Do not introduce destructive migrations.

# Architecture

`AdminController.updateBannerHome()` unwraps multipart file slots plus text fields and forwards all banner controls to `AdminService.updateBannerHome()`. `AdminService` uploads new images, preserves existing images for untouched slots, and upserts per-slot control fields on the single home banner document. `OfferService.getBannerHome()` returns the configured banner document for public reads. The customer mapper filters inactive slots locally so stale, disabled, scheduled, or expired slots do not render.

# Data Models

`Banner` stores five flat slots:

- `image_1..image_5`: image ids or URLs
- `link_1..link_5`: customer click targets
- `enabled_1..enabled_5`: slot visibility switch, default true for legacy compatibility
- `start_date_1..start_date_5`: optional slot start date
- `end_date_1..end_date_5`: optional slot end date

Legacy `start_date` and `end_date` remain accepted as document-wide fallbacks.

# API Contracts

- `POST /admin/banner-home` accepts multipart fields `image_N`, `link_N`, `enabled_N`, `start_date_N`, and `end_date_N`.
- `GET /admin/banner-home` returns the stored banner document for admin editing.
- `GET /offer/banner-home` returns the stored banner document for customer mapping.

# Security

Banner writes remain admin-authenticated and protected by existing banner management permissions. Customer reads receive only banner image ids/URLs, links, and schedule metadata, with no user PII.

# Edge Cases

- First banner save must work when no banner document exists.
- Missing `enabled_N` means enabled for legacy documents.
- Empty `end_date_N` means no end date.
- Disabled, future-start, expired, or image-empty slots are hidden on the customer app.
- Empty backend result falls back to bundled customer banners.

# Testing Strategy

Use Jest for API controller/service contracts and Vitest for admin status/multipart helper behavior plus customer mapper behavior. Verify targeted tests first, then typecheck touched packages when practical.

# Rollback Plan

Because this is additive, rollback can ignore the new per-slot fields and continue using `image_N`/`link_N`. Reverting customer mapper filtering restores legacy behavior without data deletion.

# Milestones

1. API contract persists per-slot banner controls.
2. Admin Banner Management sends and displays per-slot controls.
3. Customer homepage filters active banner slots from the public endpoint.
4. Targeted tests and local smoke verification pass.

# Epics

Admin banner slot editor, public banner endpoint compatibility, customer banner filtering, and local mock parity.

# User Stories

As an admin, I want to schedule a banner slot so it appears on the customer homepage only during the campaign window.

As an admin, I want to hide a banner slot without deleting its image or link so I can pause a campaign safely.

As a customer, I only want to see banners that are currently live and clickable.

# Tasks

- Extend banner schema and DTOs with per-slot controls.
- Update admin banner save path to persist schedule and enabled fields.
- Update admin UI status and edit modal to use per-slot controls.
- Update customer mapper to filter disabled/scheduled/expired slots.
- Add targeted tests for API, admin helper behavior, and customer mapper behavior.

# Acceptance Criteria

- Admin Banner Management can save each slot's link, image, enabled state, and schedule.
- Public customer homepage renders active admin banner slots.
- Disabled, scheduled-future, expired, and empty-image slots do not render.
- Existing banner documents without per-slot fields still render.
- No active backend banners produces existing customer fixture fallback.

---

# Whole-Project Bug Hunt Addendum

# Executive Summary

Execute a non-destructive bug hunt across the GoGoCash monorepo, then fix confirmed defects with the smallest failing test first. The audit covers API, admin panel, customer app, local data mode, and admin-to-customer contracts.

# Business Goals

Give operators confidence that admin-managed Quest, Banner, and Brand workflows correctly control the customer app before further rollout.

# Technical Goals

Find and fix production-impacting regressions, console errors, contract mismatches, fixture leaks, RBAC gaps, timezone bugs, and responsive UI defects across `apps/api`, `apps/admin`, and `apps/app`.

# Requirements

- Preserve all existing local changes unless the user explicitly asks to revert them.
- Capture baseline repo state, package scripts, ports, env mode, and runtime health before fixing code.
- Run automated gates for API, admin, and customer app.
- Browser-smoke key admin and customer routes.
- Classify confirmed bugs by severity and fix P0/P1 issues first.
- For each code fix, write or update the smallest focused test before production code.
- Verify admin writes are reflected by customer reads for Quest, Banner, and Brand flows.

# Non-Goals

- Do not refactor unrelated modules.
- Do not clean or reset the dirty worktree.
- Do not run destructive migrations.
- Do not change production data.

# Architecture

The bug hunt treats the API as the source of truth for admin-managed content. Admin modules write campaign, banner, brand, and reward configuration through authenticated endpoints. The customer app must render public API responses in backend mode and use fixtures only as an intentional fallback when backend data is unavailable or empty by design.

# Testing Strategy

- API: Jest service/controller tests plus `tsc --noEmit`.
- Admin: Vitest component/helper tests plus `tsc --noEmit`.
- Customer app: Vitest source tests, render tests, and `tsc --noEmit`.
- Runtime: browser checks for key admin/customer routes, console errors, failed requests, and visible layout defects.

# Rollback Plan

Each fix must be scoped and reversible. Backend contract fixes should preserve existing payload compatibility. UI fixes should avoid data migrations. If a fix causes wider regressions, revert only that patch and keep the bug report evidence.

# Milestones

1. Baseline dirty worktree, scripts, env, ports, and local data mode.
2. Run automated gates and record failures.
3. Run browser smoke checks on admin and customer surfaces.
4. Triage and fix confirmed P0/P1 defects with tests.
5. Re-run targeted gates and final smoke checks.

# Epics

Automated validation, admin runtime QA, customer runtime QA, admin-to-customer contract verification, security/RBAC audit, and defect remediation.

# User Stories

As an operator, I want admin updates to appear on the customer app so I can manage campaigns without code changes.

As a superadmin, I want protected Quest, reward, brand, and banner mutations so financial controls cannot be changed by unauthorized users.

As a customer, I want clean homepage, Quest, shop, and footer pages so the app feels reliable.

As an engineer, I want automated regression coverage for confirmed bugs so fixes remain stable.

# Tasks

- Capture baseline evidence and local runtime status.
- Run API, admin, and customer automated gates.
- Smoke-test admin routes: sign in, dashboard, Quest, Banner, Brand/Offer, and Withdraw detail.
- Smoke-test customer routes: home, Quest, brand grids, category pages, shop detail, banner clicks, and footer.
- Triage bugs by P0/P1/P2/P3 severity.
- Add failing tests for confirmed defects.
- Implement focused fixes and rerun targeted checks.
- Summarize fixed bugs, remaining risks, and commands run.

# Acceptance Criteria

- All confirmed P0/P1 bugs are fixed or explicitly blocked with root cause.
- Quest, Banner, and Brand admin modules correctly control customer app output.
- Customer pages render without footer, card, or layout regressions.
- Admin pages render without date picker, dropdown, or console-warning regressions.
- API, admin, and customer targeted tests and typechecks pass or any pre-existing failures are documented.
- No user or previous local changes are reverted.
