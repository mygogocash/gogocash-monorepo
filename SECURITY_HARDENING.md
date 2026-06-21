# Security & Reliability Hardening — 2026-06-14

A money/auth hardening pass over the monorepo, driven from a full project analysis
(grade C+, 5 confirmed findings, 0 refuted). Every change is TDD'd and verified;
this doc is the durable record. The work landed on **`main`** (the `migrate/monorepo` integration branch has since been retired).

## What shipped

| PR | Contents | State |
|----|----------|-------|
| **#37** | P0 — V-1…V-5 + V-2b admin-approve + V-5 API-key | merged |
| **#39** | P1-FX (fail-closed FX) · P1-SESS (admin session 30d→7d) · P2-INTEG (real Mongo integration test) | merged |
| **#40** | P1-TX (serialized bank-transfer) · P1-COLLSCAN groundwork · P2-APP scoping · P2-CI gating · `ci-gate` aggregator | merged |

## Verified risk register (closed)

| ID | Sev | Issue | Fix |
|----|-----|-------|-----|
| **V-1** | CRIT | No global `ValidationPipe` — class-validator decorators were dead | `main.ts` global pipe (`transform`, `forbidUnknownValues:false`); decorated `CreateWithdrawDto`. Whitelist hardening → **#46** |
| **V-2** | CRIT | `POST /withdraw` + `/bank-transfer` trusted client amount, no balance gate; client `tx_hash` self-approved | `assertWithinBalance` gate; `create()` → `pending` + admin `PATCH /withdraw/:id/approve` (V-2b) |
| **V-3** | HIGH | Withdraw-method get/update/delete IDOR (no owner scope) | scoped to `{_id, user_id}` (atomic `findOne*`) + `isValidObjectId` guard |
| **V-4** | HIGH | Unauth cashback-balance leak (`user.controller.ts`) | `@UseGuards(AuthAdminGuard)` |
| **V-5** | HIGH | Unauth involve routes (offer mutation + `create-affiliate-ai` deeplink minting) | `AuthAdminGuard` on offer routes; **fail-closed API-key guard** (`INVOLVE_AI_API_KEY`) on the external AI route |

## Reliability (P1) — done

- **P1-FX:** `convertCurrencyUsd/Thb` now cached (10 min) + 5 s timeout + **fail-closed** (never the old `null` that silently zeroed foreign-currency balances).
- **P1-TX:** `createBankTransfer` balance-check + insert wrapped in a per-user serialized Mongo transaction (a `$inc` on the user doc forces a WriteConflict → retry → re-check), closing the double-withdraw TOCTOU. **Proven against a real replica set.** `createManualWithdrawRequest` was already safe via its partial unique index.
- **P1-SESS:** admin NextAuth session `maxAge` 30 d → 7 d.
- **P1-COLLSCAN:** groundwork — tested parser, verified backfill script (`npm run backfill:conversion-userid[:dry]`), in-repo write population.

## CI / tooling (P2) — done

- **P2-INTEG:** real `checkWithdraw`↔Mongo 7 integration test (`apps/api/test/withdraw-balance.e2e-spec.ts`), wired into the required CI job — covers the mongoose-9 aggregation risk mocks can't.
- **P2-CI:** admin **test** + app **typecheck/unit/render** flipped to CI gates (all verified green). Admin **lint** stays informational (real react-hooks debt → **#45**).
- **P2-MAINPROTECT:** added the `ci-gate` aggregator so branch protection works with path-filtered jobs (require only `CI gate (required)`).

## Open follow-ups

| Issue | Item | Blocker |
|-------|------|---------|
| **#41** | P1-TX `create()` on-chain reserve-then-settle | on-chain call can't sit inside the Mongo txn |
| **#42** | P1-COLLSCAN read-switch (`$regex` → `{user_id}`) | run backfill + update the **external** Involve sync to set `user_id` |
| **#43** | P1-SESS: accessToken BFF + session revocation | needs a BFF refactor + owner mechanism pick |
| **#44** | Enable branch protection | private free repo — protection & rulesets both `403` (upgrade plan or make public) |
| **#45** | Clean ~54 admin react-hooks lint warnings, then gate admin lint | component refactors |
| **#46** | V-1: audit body DTOs, enable `ValidationPipe` whitelist | full DTO audit (largely retires #34) |
| #19 | `packages/contracts` extraction (P2-CONTRACTS) | large 3-consumer refactor |
| #35 | App data/withdraw/native-auth epic (`apps/app/docs/customer-app-epic-scoping.md`) | owner creds (EXPO_TOKEN, store, native Firebase) |
| #36 | firebase-admin-14 real-token login QA (mongoose-9 half automated by P2-INTEG) | owner-manual staging check |

## Owner action items

1. **Smoke-test staging** (login incl. Telegram, withdraw, profile) — unit tests bypass the global `ValidationPipe`.
2. Set **`INVOLVE_AI_API_KEY`** secret + have the external caller send `x-api-key`, or `create-affiliate-ai` stays locked.
3. Add an admin **"Approve"** button → `PATCH /withdraw/:id/approve` (on-chain withdrawals now land `pending`).
4. To enable branch protection (#44): upgrade the GitHub plan or make the repo public.
