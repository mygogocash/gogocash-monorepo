# GitHub Actions environments & secrets

Cross-reference for CI/CD credentials. **Never commit secret values.**

## GitHub Environments

| Environment | Used by | Purpose |
|-------------|---------|---------|
| `staging` | `_build-push.yml`, `_deploy-cloudrun.yml`, EAS workflows | GCP WIF + Expo Firebase client secrets for staging builds |

**Future:** Add required reviewers on `staging` when repo is Pro/public (#44).

## Repository secrets & variables

### GCP (Cloud Run rollback)

| Name | Type | Where |
|------|------|-------|
| `GCP_PROJECT_ID` | Variable | Environment `staging` |
| `GCP_WIF_PROVIDER` | Variable | Environment `staging` |
| `GCP_SERVICE_ACCOUNT` | Variable | Environment `staging` |

Runtime secrets stay in **GCP Secret Manager** — mapped in `release-staging.yml` (`MONGO_URI`, `JWT_*`, `INVOLVE_*`, etc.).

### Expo / EAS

| Name | Type | Where |
|------|------|-------|
| `EXPO_TOKEN` | Secret | Repository or `staging` environment |

Firebase client keys for EAS build: Environment `staging` secrets `EXPO_PUBLIC_FIREBASE_*`.

### Staging smoke

| Name | Type | Purpose |
|------|------|---------|
| `INVOLVE_POSTBACK_TEST_TOKEN` | Secret (optional) | Enables Involve postback check in `staging-smoke.yml` — must match Railway `INVOLVE_POSTBACK_SECRET` |

## Railway (primary staging deploy)

Railway holds runtime secrets for **`gogocash-api`**, **`gogocash-admin`**, **`@gogocash/mobile`**. GitHub Actions does **not** deploy Railway by default.

| API env var | Distinct from |
|-------------|---------------|
| `INVOLVE_SECRET` | Involve Asia API (sync, deeplinks, GoGoTrack activate) |
| `INVOLVE_POSTBACK_SECRET` | `?token=` on `GET /involve/postback` only |

Full matrix: **`docs/railway-env-matrix.md`**.

## Promotion checklist

1. Dependabot PR → `main` → merge  
2. PR `main` → `dev` → CI green → merge  
3. PR `dev` → `staging` → `ci-staging` green → merge → Railway deploy  
4. Optional: run `staging-smoke.yml`  
5. Production: locked — GCP/Railway cutover is a separate deliberate step  
