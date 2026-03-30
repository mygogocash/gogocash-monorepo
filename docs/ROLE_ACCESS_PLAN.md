# Role-based access control (RBAC) — implementation plan

This plan matches the current codebase: **NextAuth (JWT)**, **`AuthGuard`** (authenticated only), **no roles in session today**, and **mock or real login** via `src/app/api/auth/[...nextauth]/route.ts`.

---

## 1. Goals and principles

| Goal | Detail |
|------|--------|
| **Least privilege** | Users only see routes and actions their role allows. |
| **Single source of truth** | Prefer **backend** roles/permissions on the token or a `/me` payload; the UI mirrors that, it does not invent security. |
| **Defense in depth** | UI hiding + **route guards**; APIs must still **authorize server-side** (your API repo). |
| **Auditable** | Log denied access (optional) and keep role definitions in one module. |

---

## 2. Current state (baseline)

- **`AuthGuard`**: redirects unauthenticated users to `/signin`; **no role checks** (`src/components/auth/AuthGuard.tsx`).
- **Session**: JWT + `session.accessToken`; user `name` / `email` from credentials provider; **no `role` on JWT/session** yet.
- **Login types**: `LoginResponse` has `token` but **no `role` field** in `src/types/api.ts` (extend when API contract is fixed).
- **Admin listing**: `AdminUsersQuery` already supports **`role`** filter — backend likely has role concepts; align types with real API.
- **Navigation**: flat list in **`AppSidebar`** — all items visible to any signed-in user.

---

## 3. Recommended role model (to confirm with API)

Pick **one** style and stick to it:

### Option A — **Roles only** (simpler)

Examples: `super_admin`, `admin`, `support`, `read_only`.

- Map each **sidebar path** and **destructive action** to allowed roles.

### Option B — **Roles + permissions** (scalable)

Examples: `users.read`, `users.write`, `offers.write`, `withdraw.approve`, `admin.manage`.

- Roles are **bundles** of permissions; checks use `can('withdraw.approve')`.

**Decision checkpoint:** Confirm with `gogocash_api` what login and `/admin/me` (or equivalent) return: role string, array of permissions, or both.

---

## 4. Session and token changes

1. **Extend API contract** (types + mock):
   - Add `role` (and optionally `permissions: string[]`) to **`LoginResponse`** and mock login payload.
2. **NextAuth `authorize`**:
   - Pass `role` / `permissions` from `apiClient.login` (and mock user object).
3. **JWT callback**:
   - Copy `role` / `permissions` onto `token` on first sign-in; refresh strategy if you add token refresh later.
4. **`session` callback**:
   - Expose `session.user.role` and/or `session.permissions` to the client (only what the UI needs; avoid huge JWTs).
5. **TypeScript**: extend `next-auth` module augmentation in `[...nextauth]/route.ts` (or `types/next-auth.d.ts`) for typed `Session` / `JWT`.

---

## 5. Authorization layers (implementation order)

### Phase 1 — **Read-only session helpers** (no UX change)

- Add `src/lib/auth/roles.ts` (or `permissions.ts`):
  - `getSessionRoles(session)`, `canAccessPath(path, ctx)`, `can(permission)`.
- Unit tests for pure functions.

### Phase 2 — **UI: sidebar and buttons**

- **`AppSidebar`**: filter `navItems` / `othersItems` by role/permission metadata on each item (e.g. `requiredRoles: ['admin']` or `permission: 'offers.read'`).
- **Tables / forms**: hide primary actions (delete, approve, invite admin) when `!can(...)`.
- Optional **`AccessDenied`** stub component for inline “no permission” messages.

### Phase 3 — **Route protection**

- **`middleware.ts`** (edge): optional lightweight check if JWT is readable there; **NextAuth JWT is often encrypted** — many teams guard in **server components** or a **client `RoleGuard`** instead.
- Recommended for App Router:
  - **`RoleGuard`** client component (same pattern as `AuthGuard`): if authenticated but wrong role → redirect to `/` or `/403`.
  - Wrap **sensitive route segments** in `src/app/(admin)/.../layout.tsx` or per-page, **or** use a single layout wrapper with a **route → requirement** map.
- Add **`/403`** (or reuse blank) for forbidden.

### Phase 4 — **Server-side** (if you add RSC data fetching or Route Handlers)

- Never trust the client: **verify token + role** on API calls (already the API’s job).
- For Next **Route Handlers** in this repo, validate session server-side before proxying.

### Phase 5 — **Mock and E2E**

- Mock users: e.g. `support@gogocash.co` / `1234` → `support` role in dev only.
- Document test accounts in `README` / runbook.
- Optional Playwright flows: sign in as each role, assert sidebar and one protected route.

---

## 6. Suggested route → role matrix (draft)

Adjust to match product and API.

| Area | Path prefix | Example roles allowed |
|------|-------------|------------------------|
| Dashboard | `/dashboard` | all internal roles |
| Users (end) | `/users` | admin, support, read_only |
| Admin users | `/admin-users` | super_admin, admin |
| Offers / category / coupon / quest | various | admin, support (read_only: read-only where applicable) |
| Withdraw / conversion approve | `/withdraw`, `/conversion` | admin, support (narrow approve to admin only if required) |
| Fee | `/fee` | super_admin, admin |
| Deeplink / banner | `/deeplink`, `/banner` | admin, marketing (if exists) |

Empty cells mean **define with stakeholders**.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| JWT too large | Store minimal claims; fetch fine-grained permissions lazily if needed. |
| Stale role after promotion | Short session TTL + re-login, or refresh endpoint updating token claims. |
| URL guessing | **Always** enforce on API; UI is UX only. |
| Mock vs prod drift | Same `LoginResponse` shape in mock and real API. |

---

## 8. Deliverables checklist

- [ ] API contract documented (role/permissions on login or `/me`).
- [ ] `LoginResponse` + NextAuth JWT/session updated.
- [ ] `src/lib/auth/roles.ts` (or permissions) + types.
- [ ] `AppSidebar` filtered by config map.
- [ ] `RoleGuard` + `/403` + wired layouts for sensitive sections.
- [ ] High-risk buttons gated (`AdminUsersTable`, withdraw approve, etc.).
- [ ] Runbook / README: test accounts and role matrix link.
- [ ] Lint + build green; optional E2E for two roles.

---

## 9. Open questions (answer before coding)

1. What exact **role strings** (or permission list) does production **admin login** return?
2. Is there **`GET /admin/me`** (or JWT claims) for refresh without re-login?
3. Should **support** edit offers or only view?
4. Is **read_only** a real persona or future scope?

Once (1)–(2) are fixed, Phases 1–3 can be implemented in **one vertical slice** (e.g. “hide `/admin-users` unless admin”) to validate the pattern end-to-end.
