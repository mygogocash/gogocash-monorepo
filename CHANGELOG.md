# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **RBAC module:** tiered **and dynamic** roles (`super_admin`/`admin`/`editor`/`viewer` + runtime-created custom roles), a `resource:action` permission matrix, Role Management UI (`/roles`), and three-layer enforcement (edge proxy, client guard, API). See `docs/RBAC.md`.
- **Admin Management** sidebar section (Users Admin + Roles) with a Role column on the admin-users table.
- **Dashboard insights:** range control with presets + auto-filled From/To inputs, executive summary, analytics, and statistics chart.
- Shared validation helpers (`src/lib/formValidation.ts`) and the `useObjectUrl` hook (`src/hooks/useObjectUrl.ts`).
- **Docs:** `docs/DESIGN_SYSTEM.md` (tokens/typography/components), `docs/PROJECT_STATUS.md` (progress/handoff), and commit/changelog workflow (`docs/COMMITS_AND_CHANGELOG.md`).

### Changed

- Reorganized nav: **Admin Management** (Users Admin + Roles) split out from **Users Management**.
- Fee-form money inputs switched to `type="number"`; AdminUsers pagination now derives `hasNext/PrevPage` from the API response.

### Fixed

- Project-wide bug hunt: pagination clamping, `update-offer` NaN guard, PUT persistence + 404s for unknown ids, unimplemented-DELETE → 404, monotonic conversion ids, `formatPrice` zero handling, blob-URL leaks (→ `useObjectUrl`), debounced search + out-of-order response race guards on list tables, stable list keys, admin-user avatar crash guard, and `Promise.allSettled` on the recent-activity widget.

### Security

- Server-side write enforcement: every non-GET mock route is permission-gated (`requiredWritePermission` in `mockApiCore.ts`, **fail-closed** for unmapped `admin/*` writes), closing the gap where only `adminUsers:manage` was checked.
- JWT role backfill now defaults to **least-privilege** (`DEFAULT_ROLE`) outside mock mode instead of `super_admin`; unauthenticated `/api/*` returns `401`.

---

## [2.0.2] - TBD

_Backfill this section when you adopt this changelog: set the real release date and summarize changes from `git log` or merged PRs. Optional: add compare links at the bottom of the file once the remote URL is fixed._

<!-- [Unreleased]: https://example.com/compare/v2.0.2...HEAD -->
<!-- [2.0.2]: https://example.com/releases/tag/v2.0.2 -->
