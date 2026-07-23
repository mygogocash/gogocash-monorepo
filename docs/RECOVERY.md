# RECOVERY — GoGoCash incident runbook

One page. Where the data is, how to reach it, and how to roll back. **No secrets
live here** — every credential is referenced by env-var name or dashboard location.

## Two stacks

| | Google Cloud (current real prod) | Railway (`production` env = beta) |
|---|---|---|
| Customer web | `app.gogocash.co` (Cloud Run) | `beta.gogocash.co` (`@gogocash/mobile`) |
| API | `api.gogocash.co` (Cloud Run) | `api-beta.gogocash.co` (`gogocash-api`) |
| Admin | `admin.gogocash.co` | `admin-beta.gogocash.co` (`gogocash-admin`) |
| Database | MongoDB **Atlas** (`gogocash` DB) | Railway **MongoDB** service (`mongodb.railway.internal`) |
| DNS | Cloudflare (proxied) | Cloudflare (proxied) |

DNS is the cutover lever: pointing the `*.gogocash.co` records at the Railway
services (or back at Cloud Run) is instant at the Cloudflare edge.

## Database

- **Live (beta/Railway):** the API reads `MONGO_URI` (a Railway service-reference
  var on `gogocash-api`). Do **not** print its value.
- **Rollback copy (Atlas):** still intact and retained ≥7 days after cutover. Its
  URI lives in `~/.gogocash-secrets/.env.railway.production` (`MONGO_URI`) and in
  the Cloud Run service env. **Rotate the Atlas password after cutover** — it was
  exposed in a prior working session.
- **Reach Railway Mongo** (private-only, no public proxy) from inside its container:
  ```bash
  railway ssh --service mongodb --environment production
  # mongosh / mongodump / mongorestore are available in the container
  ```
- **DB rollback:** repoint `MONGO_URI` back to Atlas via **stop-start, not a
  rolling deploy** (rolling = both instances write different DBs = split-brain that
  defeats the unique-index money guards). Keep `WITHDRAWALS_ENABLED=false` during
  the switch and until index + balance parity is re-confirmed.

## Compute rollback (after a bad cutover)

1. Flip the Cloudflare DNS records for `admin` → `app` → `api` back to Cloud Run
   (instant; **no data loss** while both stacks share a DB / identical secrets).
2. Reverse the single-owner scheduler handoff (below).
3. Cloud Run stays scaled-to-zero (not deleted) for ≥7 days for exactly this.

## Kill switches (env vars on `gogocash-api`)

- `WITHDRAWALS_ENABLED=false` — emergency brake: `getSign` + chain broadcast return
  503, everything else keeps working. Use it first in any risky window.
- `CRON_ENABLED=false` and `QUEST_TASK_V2_ENABLED=false` — legacy crons + quest-v2.
  **Never** run schedulers on both stacks at once (dual-write). Confirm ownership
  from the boot log line: `scheduler-ownership legacy_crons=.. quest_v2=.. withdrawals=..`.

## First moves in an incident

1. Check dashboards: auth-failure rate, `getSign` error rate, stuck-broadcast count
   (`chain_record_state:'broadcast'` older than N min), 5xx rate.
2. **Roll back first, debug second** — DNS flip is instant and lossless.
3. If money paths look wrong: set `WITHDRAWALS_ENABLED=false` immediately.
4. Health: `https://api-beta.gogocash.co/health` (Railway) returns 200.

See also: `docs/railway-mongo-replica-set.md`, `docs/line-login-channel.md`.
