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

## Permissions (operator guide)

Permission strings are `` `${resource}:${action}` `` (e.g. `withdraw:view`,
`adminUsers:manage`) plus `withdraw:approve` and `payments:refund`. The
enforcement matrix is `ROLE_PERMISSIONS` in `src/lib/rbac/permissions.ts`.
Checks: `can(role, permission)` / `canAny(role, [...])`.

**Human-readable catalog** (labels, descriptions, risk, routes, soft
dependencies) lives in
[`src/lib/rbac/permissionCatalog.ts`](../src/lib/rbac/permissionCatalog.ts)
and drives the **/roles** Create/Edit modal.

### How to read a permission

| Verb | Meaning for non-tech admins |
| ---- | --------------------------- |
| **View** | See the section (menus + pages). Cannot change data. |
| **Manage** | Create or edit in that section. Turning Manage on also turns View on. |
| **Approve / Refund** | Money moves (payouts / refunds). Critical trust. |

**Risk levels:** `low` → `medium` → `high` → `critical` (money or IAM).

**Status flags in the UI:**

- `enforced` — wired in sidebar / routes / mock API writes
- `partially enforced` — assignable, but some UI or API paths still use broader checks
- `limited wiring` — in the picker for future use; little or no live gating yet

### Plug-and-play role templates

On **Create role**, presets fill name + description + checkboxes (still editable):

| Template | Intent |
| -------- | ------ |
| Viewer (read-only) | All `*:view` |
| Content editor | Editor-like manage (brands, banner, coupon, quest, conversion) + all view |
| Support | All view + `users:manage` |
| Finance ops | Withdraw manage/approve, fee manage, payments manage/refund, users manage + all view |
| Ops admin (no IAM) | Everything except `adminUsers:manage` |

### Permission matrix (summary)

Full prose for each key is in `permissionCatalog.ts`. Grouped for operators:

#### Platform
| Permission | What it unlocks |
| ---------- | --------------- |
| `dashboard:view` | Platform Dashboard, executive charts |
| `dashboard:manage` | Dashboard config (limited wiring today) |
| `activity:view` | Activity feed |
| `activity:manage` | Activity admin (limited wiring today) |

#### Customers
| Permission | What it unlocks |
| ---------- | --------------- |
| `users:view` | Customers, membership, subscription, credit score, referral, GoGoPass |
| `users:manage` | Edit customers; wallet / cashback adjustments (money-moving) |

#### Admin team
| Permission | What it unlocks |
| ---------- | --------------- |
| `adminUsers:view` | List of admin users |
| `adminUsers:manage` | Invite/remove admins, change roles, edit Roles page (**critical**) |

#### Brands & content
| Permission | What it unlocks |
| ---------- | --------------- |
| `brands:view` / `brands:manage` | Brands, create brand, missing orders, search config, categories, discover |
| `banner:view` / `banner:manage` | Home / brand banners & popups |
| `conversion:view` / `conversion:manage` | Conversions & transactions |

#### Money & payouts
| Permission | What it unlocks |
| ---------- | --------------- |
| `withdraw:view` / `withdraw:manage` | Withdraw Management |
| `withdraw:approve` | Approve/reject payouts (**critical**, partially enforced) |
| `fee:view` / `fee:manage` | Fee structure |
| `payments:view` / `payments:manage` / `payments:refund` | Commerce payments (catalog_only / partial today) |

#### Commerce catalog
| Permission | What it unlocks |
| ---------- | --------------- |
| `catalog:*` | Products, shops, catalog banners |
| `inventory:*` | Inventory |
| `orders:*` | Catalog orders |

#### Coupons & quests
| Permission | What it unlocks |
| ---------- | --------------- |
| `coupon:view` / `coupon:manage` | Coupons |
| `quest:view` / `quest:manage` | Quests, rewards, points (manage partially API-restricted) |

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
- **Client** (`usePermissions`) fetches `/admin/roles` (React Query) → sidebar, buttons,
  and `RoutePermissionGuard` honor custom roles.
- **Edge proxy** can't read the runtime store, so it enforces **built-in tiers** only;
  custom-role route gating is handled client-side by `RoutePermissionGuard` (+ the API).

## The three enforcement layers

1. **UI** — `usePermissions()` hook (`can` / `canAny`).
   - Sidebar items are filtered by permission (`src/layout/AppSidebarContent.tsx`).
   - Action buttons are gated (e.g. invite / change-role / delete in `AdminUsersTable`).
2. **Route proxy** — `src/proxy.ts` (Next.js 16's middleware) reads the JWT, maps the
   path to a permission via `permissionForRoute(pathname)`, and redirects to `/403` if denied.
3. **API** — the mock route handler ([`route.ts`](../src/app/api/mock/[...path]/route.ts))
   passes the caller's role into `handleMockApiRequest`; `src/lib/mockApiCore.ts` returns
   **403** for writes without the mapped permission (`requiredWritePermission`).
   A real backend should mirror this server check — UI/middleware gating is not sufficient on its own.

> **Known gap — cashback approval UI.** The cashback-approval flow on the withdrawal
> detail page (route `/withdraw/:id`) — the "Adjust Wallet" panel
> ([`UserWalletPanel.tsx`](../src/components/wallet/UserWalletPanel.tsx)) and the
> "Cashback approval needed" notice
> ([`CashbackApprovalNotice.tsx`](../src/components/wallet/CashbackApprovalNotice.tsx),
> rendered from [`WithdrawDetail.tsx`](../src/components/withdraw/WithdrawDetail.tsx)) —
> is **not** wrapped in `usePermissions`, so every admin who can open the page
> sees it. The API layer still gates the writes: `admin/wallets/*` mutations (adjust,
> freeze, unfreeze, and `cashback-request/:id` approve/reject) require `users:manage` via
> `requiredWritePermission` in `mockApiCore.ts`. Add UI gating once RBAC is wired into this view.

## Extending

- **New custom role:** use the **/roles** page (or a Create-role template) — no code change.
- **New built-in tier:** add to `ROLES` + `ROLE_LABELS` + `ROLE_BADGE_CLASSES` (roles.ts) and `ROLE_PERMISSIONS` (permissions.ts) (this seeds the store).
- **New resource/route:** add the permission to `permissions.ts` (`ALL_PERMISSIONS` + `ROUTE_VIEW_PERMISSION`) **and** a matching entry in `permissionCatalog.ts` (tests fail if either is missing).
- **Gate a button/section:** check `usePermissions().can(…)`.
- Tests: `permissions.test.ts`, `permissionCatalog.test.ts`, `RoleManagement.source.test.ts`.
