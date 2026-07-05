# Inert — GitHub Actions live at repo root

GitHub **only** runs workflows under [`.github/workflows/`](../../.github/workflows/) at the monorepo root.

The YAML files in this directory are **legacy copies** and are **not executed**. Use:

| Purpose | Workflow |
|---------|----------|
| CI (lint, test, build) | [`ci.yml`](../../.github/workflows/ci.yml) |
| Staging push CI gate | [`ci-staging.yml`](../../.github/workflows/ci-staging.yml) |
| GCP image build (rollback) | [`build-staging.yml`](../../.github/workflows/build-staging.yml) |
| GCP Cloud Run release | [`release-staging.yml`](../../.github/workflows/release-staging.yml) |
| Railway staging deploy | **Railway GitHub integration** on branch `staging` (not GHA) |

See [`.github/workflows/README.md`](../../.github/workflows/README.md) for the full map.
