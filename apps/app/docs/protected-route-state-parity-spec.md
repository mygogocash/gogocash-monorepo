# Executive Summary
Expo protected routes need one shared state surface for startup loading, guarded route checks, unauthenticated redirects, offline retry, backend-data blocking, and auth callback handoff states.

> **Update (June 2026):** Protected-route gating moved from the `AuthRouteGuard` wrapper
> (which unmounted the navigator and collapsed protected-route taps back to home) to
> expo-router native `Stack.Protected` in `app/_layout.tsx` (commit `5886012`), with the
> `/profile` tab self-guarding via `<Redirect>`. `AuthRouteGuard` is retired; its
> offline-retry and unauthenticated route-state variants are no longer rendered —
> unauthenticated access now redirects to `/login`. `CustomerRouteState` is still used for
> the startup splash and the auth-callback states. The sections below describe the original slice.

# Business Goals
Keep customer account flows aligned with the Next.js reference by preventing blank screens and inconsistent protected-route copy while session state is being resolved.

# Technical Goals
- Replace local protected-route cards with a reusable Expo state component.
- Add startup loading UI while runtime fonts load.
- Preserve safe login redirects for protected routes.
- Add an offline retry state for unauthenticated protected-route checks on web.

# Requirements
- Shared variants: loading, empty, error, offline, unauthenticated.
- Typography must use `typography.family`, `typography.titleWeight`, and body line-height tokens.
- Surface colors must resolve through `ThemeColors` (`useThemedStyles`) so loading/error/offline cards remain readable in dark mode — see `docs/dark-mode.md`.
- Error and offline variants must expose alert semantics.
- CTAs must use the same motion pressable pattern as other customer surfaces.

# Non-Goals
- No backend account-data integration in this slice.
- No new native networking dependency.
- No redesign of content-specific empty states such as wallet transactions.

# Architecture
`CustomerRouteState` owns the visual contract. `AppProviders` (startup loading) and `CustomerAuthCallbackScreen` consume it instead of duplicating local loading cards. (Protected-route gating later moved from the `AuthRouteGuard` wrapper to native `Stack.Protected` — see the Update note above.)

# Data Models
No persisted data model changes.

# API Contracts
No API contract changes.

# Security
Protected routes continue to redirect through sanitized internal callback paths only. Production fixture-data blocking remains enforced.

# Edge Cases
- Missing local session on a protected route redirects to `/login`.
- Missing local session while the web runtime is offline shows an offline retry state.
- Invalid auth callback payloads show the shared error state.
- Font loading no longer renders a blank app shell.

# Testing Strategy
- Static Vitest parity contracts for shared state variants and consumer usage.
- Existing route-guard unit tests for protected-route redirects and callback sanitization.
- Full mobile gate after implementation.

# Rollback Plan
Revert `CustomerRouteState` usage in `AppProviders` and `CustomerAuthCallbackScreen`; the previous local cards and null font-loading state can be restored without data migration.

# Milestones
- Milestone 1: Add RED route-state parity coverage.
- Milestone 2: Implement shared route-state component and wire consumers.
- Milestone 3: Run focused tests, full tests, typecheck, and Expo web export.

# Epics
- Protected-route UX parity.
- Startup loading parity.
- Auth callback state parity.

# User Stories
As a returning customer, I want protected account pages to show a clear session-checking state so that I know the app is working.

As a customer without a session, I want protected pages to send me to sign in with my destination preserved so that I can continue after auth.

As a customer on an unreliable connection, I want an offline retry state so that I am not dropped into a blank or confusing redirect.

# Tasks
- Add route-state parity tests.
- Add `CustomerRouteState`.
- Wire app startup loading.
- Wire auth guard loading, unauthenticated, offline, and fixture-blocked states.
- Wire auth callback pending, missing, success, and error states.
- Update progress docs.

# Acceptance Criteria
- No blank render while fonts load.
- Shared route-state component includes all required variants.
- Guard and callback no longer duplicate route-state card styles.
- Existing protected-route security tests remain green.
