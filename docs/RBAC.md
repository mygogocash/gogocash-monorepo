# RBAC — Role-Based Access Control

Tiered roles gate the admin panel across three layers: UI, route middleware, and
the API. The permission logic lives in one pure module — [`src/lib/rbac`](../src/lib/rbac) —
shared by client and server.

## Roles

`super_admin` › `admin` › `editor` › `viewer` (see `src/lib/rbac/roles.ts`).

| Role          | Access                                                                            |
| ------------- | --------------------------------------------------------------------------------- |
| `super_admin` | Everything, including managing admin users & their roles (`adminUsers:manage`).   |
| `admin`       | All view + all manage **except** managing admin users.                            |
| `editor`      | View everything; manage content only (brands, banner, coupon, quest, conversion). |
| `viewer`      | View only.                                                                        |

## Permissions

Permission strings are `` `${resource}:${action}` `` (e.g. `withdraw:view`,
`adminUsers:manage`) plus `withdraw:approve`. The matrix is `ROLE_PERMISSIONS` in
`src/lib/rbac/permissions.ts`. Checks: `can(role, permission)` / `canAny(role, [...])`.

## How a role is assigned

- Carried on the NextAuth JWT/session (`session.user.role`) — see the `authorize`/`jwt`/`session`
  callbacks in `src/app/api/auth/[...nextauth]/route.ts`.
- Sessions minted before RBAC existed are **backfilled** in the `jwt` callback so no one is locked out.
- **Local/demo:** sign in (password `1234`) as `viewer@…`, `editor@…`, `operator@…`/`manager@…`
  to test those roles; anything else (incl. `admin@gogocash.co`) is `super_admin`.
- **Real backend:** role comes from the login response (`userData.role`).
- Mock login also honors an admin user's **assigned** role (set in Admin Users), so a
  user given a custom role logs in with it.

## Role Management (dynamic roles)

Roles are **data**, not code. The server source of truth is an in-memory store
([`src/lib/rbac/roleStore.ts`](../src/lib/rbac/roleStore.ts)), seeded from the built-in
tiers and editable by super admins at **/roles**
([RoleManagement.tsx](../src/components/admin/RoleManagement.tsx)). CRUD goes through
`/admin/roles` (GET is open to authenticated users; POST/PUT/DELETE require
`adminUsers:manage`). System roles can't be deleted and `super_admin` is locked to full
access. The store resets on restart (a real backend would persist).

- **Server** (`mockApiCore`) reads the store directly → custom roles are enforced on the API.
- **Client** (`usePermissions`) fetches `/admin/roles` (React Query) → sidebar, `<Can>`,
  buttons, and `RoutePermissionGuard` honor custom roles.
- **Edge proxy** can't read the runtime store, so it enforces **built-in tiers** only;
  custom-role route gating is handled client-side by `RoutePermissionGuard` (+ the API).

## The three enforcement layers

1. **UI** — `usePermissions()` hook + `<Can permission=…>` component.
   - Sidebar items are filtered by permission (`src/layout/AppSidebarContent.tsx`).
   - Action buttons are gated (e.g. invite / change-role / delete in `AdminUsersTable`).
2. **Route proxy** — `src/proxy.ts` (Next.js 16's middleware) reads the JWT, maps the
   path to a permission via `permissionForRoute(pathname)`, and redirects to `/403` if denied.
3. **API** — the mock route handler ([`route.ts`](../src/app/api/mock/[...path]/route.ts))
   passes the caller's role into `handleMockApiRequest`; `src/lib/mockApiCore.ts` returns
   **403** for admin-user management writes (invite / update / delete) without `adminUsers:manage`.
   A real backend should mirror this server check — UI/middleware gating is not sufficient on its own.

## Extending

- **New custom role:** use the **/roles** page (Role Management) — no code change.
- **New built-in tier:** add to `ROLES` + `ROLE_LABELS` + `ROLE_BADGE_CLASSES` (roles.ts) and `ROLE_PERMISSIONS` (permissions.ts) (this seeds the store).
- **New resource/route:** add the permission to the matrix and a `ROUTE_VIEW_PERMISSION` entry in `permissions.ts` (`src/proxy.ts` already runs on all routes).
- **Gate a button/section:** wrap with `<Can permission="…">` or check `usePermissions().can(…)`.
- Tests for the matrix/route-map live in `src/lib/rbac/permissions.test.ts`.
