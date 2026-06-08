# Code review checklist (GoGoCash Admin)

Use this for PRs and periodic audits. Check boxes when done; note exceptions in the PR description.

## Security and access

- [ ] **Admin routes** are gated client-side in `src/app/(admin)/layout.tsx` by `AuthGuard` (unauthenticated → redirect to `/signin`) + `RoutePermissionGuard` (role/permission check via `permissionForRoute` / `ROUTE_VIEW_PERMISSION` in `src/lib/rbac/permissions.ts`). There is **no Next.js `middleware.ts`**; write actions are enforced server-side in `mockApiCore` (`requiredWritePermission`). _A static export (manual Firebase deploy) runs the same client guards, but the Firebase static shims may synthesize a session — treat that deploy as internal-only._
- [ ] **Mock password `1234`** is only accepted when `isMockAdminPasswordAllowed()` is true (development, `ALLOW_MOCK_ADMIN_PASSWORD=true`, or `NEXT_PUBLIC_FIREBASE_STATIC=1` for static export).
- [ ] **Secrets** (`NEXTAUTH_SECRET`, etc.) are not committed; staging/prod use host/CI secrets.
- [ ] **Open redirects** avoided: `callbackUrl` must be a same-origin path (starts with `/`, not `//`).
- [ ] **PII / tokens** not logged in production code paths.
- [ ] **Money-moving write actions** are gated by a write-level permission, not just route view. _Known gap: the cashback approve/reject UI (`CashbackApprovalNotice` in `WithdrawDetail`) and the wallet-adjust panel (`UserWalletPanel`) render for anyone who can view `/withdraw` (`withdraw:view`), with no `<Can>` gate. The underlying `admin/wallets/*` writes ARE gated server-side — `requiredWritePermission` in `mockApiCore.ts` maps them to `users:manage` — but that's broad, not approval-specific, and the routes in `src/lib/mockAdminFeatures.ts` add no further check. Approving credits the cashback balance — add a UI gate and consider tightening to `withdraw:approve` (or a dedicated wallet permission) once RBAC write-enforcement reaches this view._

## Auth and session

- [ ] NextAuth `authorize` failures return `null` without leaking stack traces to clients.
- [ ] Session/JWT module augmentation in `src/types/next-auth.d.ts` matches callback shape (no stray `any`).
- [ ] Sign-out and expired session behave predictably (redirect to `/signin`).

## API and data

- [ ] `src/types/api.ts` matches mock handlers in `mockApiCore` / `app/api/mock` for changed endpoints.
- [ ] `ApiClient` errors map to `ApiError` consistently; UI surfaces a clear message.
- [ ] New admin actions validate input before POST/PATCH (client + server where applicable).

## React / UX

- [ ] `react-hooks/exhaustive-deps` suppressions have a one-line reason or are removed after fixing deps.
- [ ] Loading and error states for data fetches (React Query / local state).
- [ ] No template placeholders (wrong company URLs, lorem) in user-visible copy.

## Quality gates

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] No new `eslint-disable` without justification

## Follow-up backlog (non-blocking)

- Remove duplicate or unused files (e.g. stray `* 2.tsx` copies).
- Add smoke tests (Playwright) or unit tests for critical paths (`mockApiCore`, auth policy).
- Align README framework version with `package.json`.
- Gate the cashback approval / wallet-adjust **UI** (no `<Can>` today) and tighten its write permission: `admin/wallets/*` writes are gated only by the broad `users:manage` (`requiredWritePermission` in `mockApiCore.ts`), while `src/lib/rbac/permissions.ts` already defines the narrower `withdraw:approve`.

## References

- Mock auth policy: `src/lib/mockAuthPolicy.ts`
- Post-login redirect validation: `src/lib/safeCallbackUrl.ts` (used by sign-in UI and Firebase static auth shim)
- AI handoff: root `README.md`

## Review notes (rolling)

**Strengths:** Clear split between mock API (`mockApiCore`, `/api/mock`) and real `apiClient`; `AuthGuard` + `RoutePermissionGuard` (no Next.js middleware) for protected routes; checklist above covers mock-password and static-export caveats.

**Risks to watch:** `useApi` falls back to a mock JWT when `session` is null — convenient for local mock data but inappropriate if a route were ever exposed without auth; keep the admin layout's `AuthGuard` + `RoutePermissionGuard` (and server-side `requiredWritePermission`) as the real gate. Mock PATCH handlers mutate shared in-memory objects — fine for demos, not for concurrent tests without isolation.

**Done recently:** Centralized `callbackUrl` sanitization (`safeAppPathFromCallback`) so static-export sign-in cannot redirect to arbitrary URLs; NextAuth `authorize` logs a single message line instead of duplicate/full error dumps.
