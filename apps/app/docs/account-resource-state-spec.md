# Executive Summary
Move protected account routes from unconditional fixture rendering to a source-aware account-resource boundary that can use fixtures locally and show explicit loading, empty, error, and offline states when backend mode is enabled.

# Business Goals
Prevent customers and QA from seeing stale demo account data when Expo is configured to read authenticated backend data.

# Technical Goals
- Centralize account-resource endpoint ownership for profile, wallet, referral, offers, merchant detail, and billing.
- Preserve fixture mode for local parity screenshots.
- Gate backend mode behind React Query, the existing mobile API client, and the existing session store.
- Reuse `CustomerRouteState` for all non-ready account-resource states.

# Requirements
- Supported account data sources: `fixtures`, `backend`, and `disabled`.
- Backend endpoints must match the Next.js reference reads.
- Offline network failures must show retry UI instead of stale fixtures.
- Empty backend payloads must show an empty state.

# Non-Goals
- No backend schema migration.
- No new API endpoints.
- No full backend response mapping into every account view in this slice.

# Architecture
`useCustomerAccountResource` resolves the resource endpoint and fetches only when `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend`. Screens keep rendering their current fixture-shaped layouts in fixture mode, and render `CustomerAccountResourceState` for backend loading, empty, error, offline, or disabled states.

# Data Models
The adapter treats backend payloads generically. Empty arrays, empty objects, and empty common collection wrappers (`data`, `rows`, `items`, `results`) are empty; non-empty payloads are ready.

# API Contracts
- Profile: `/user/profile`
- Wallet: `/withdraw/check`
- Referral: `/point/referral-list`
- Offers: `/offer/my-offers?limit=10&page=1`
- Merchant: `/offer/:merchantId`
- Billing: `/customer-billing/subscription`

# Security
The adapter uses `createMobileApiClient`, so bearer tokens come from the existing secure/web session store, and `401` keeps clearing the saved session through the existing client behavior.

# Edge Cases
- `backend` mode with no network shows offline retry.
- `backend` mode with empty server payload shows route-specific empty copy.
- `disabled` mode shows account data unavailable.
- `fixtures` mode remains stable for local visual parity.

# Testing Strategy
- RED static parity test for endpoint ownership, state component, and screen wiring.
- Existing API-client and protected-route tests continue to validate auth and redirect behavior.
- Full mobile gate after implementation.

# Rollback Plan
Remove the account-resource hook usage from the six wired screens and delete `src/account/*`; fixture rendering returns unchanged.

# Milestones
- Milestone 1: Add RED account-resource parity tests.
- Milestone 2: Implement the account-resource adapter and shared state gate.
- Milestone 3: Wire profile, wallet, referral, offers, merchant, and billing screens.
- Milestone 4: Run tests, typecheck, Expo export, and browser smoke.

# Epics
- Account backend readiness.
- Route-specific non-ready state parity.
- Local fixture-mode stability.

# User Stories
As a QA user, I want backend mode to show loading/error/offline states so that stale fixtures do not hide broken account APIs.

As a customer, I want a retry option when account data cannot load so that I can recover without restarting the app.

# Tasks
- Add account-resource endpoint registry.
- Add source-aware hook.
- Add shared account-resource state component.
- Wire six fixture-backed priority routes.
- Update progress docs.

# Acceptance Criteria
- Default fixture mode still renders the current parity screens.
- Backend mode no longer renders fixture content while data is loading, offline, errored, empty, or disabled.
- Full local mobile gate remains green.

# Verification
- `npm run test -- src/__tests__/account-resource-state-parity.test.ts src/__tests__/mobile-launch-contract.test.ts src/__tests__/api-client.test.ts`
- `npm run typecheck`
- Backend-mode Expo web export with `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend` and a local fake API at `http://127.0.0.1:19107`.
- Playwright proof for `/wallet` at `428x919` and `1495x919`: the route calls `/withdraw/check` with the stored bearer token and renders retryable error/offline states instead of fixture wallet content.
- `npm run test:full`

---

**Related:** Resource state cards use themed surfaces — [dark-mode.md](./dark-mode.md).
