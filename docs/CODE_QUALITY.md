# Code quality gates

Monorepo-wide static analysis and dead-code policies for GoGoCash.

## Tools

| Tool | Scope | CI gate |
|------|-------|---------|
| **CodeQL** | Security (`.github/workflows/codeql.yml`) | On `staging` / `main` PRs |
| **Knip** | Unused files, exports, dependencies | **Gate** — `npx knip --no-progress` in root CI |
| **ESLint** | Per-workspace lint rules | API + app gated; admin lint informational (react-hooks debt) |
| **TypeScript** | `tsc --noEmit` / build | App: `noUnusedLocals`; API/admin via build |

## Knip

Configuration lives in [`knip.json`](../knip.json) at the repo root.

- **Workspaces:** `apps/api`, `apps/admin`, `apps/app`
- **Admin dead-code cleanup:** Template leftovers removed from `apps/admin`; the admin workspace `ignore` list is empty — new unused files fail CI.
- **Export ignores:** Barrel re-exports under `apps/admin/src/layout/**`, `lib/**`, etc. remain suppressed where intentional public surfaces exist.

Run locally:

```bash
npx knip --no-progress
```

## ESLint — admin unused vars

`apps/admin/eslint.config.mjs` enables `@typescript-eslint/no-unused-vars` as **error** with `argsIgnorePattern: ^_` for intentionally unused parameters.

## TypeScript — mobile app

`apps/app/tsconfig.json` sets `noUnusedLocals: true`. Prefix intentionally unused bindings with `_` or remove them.

## CodeQL follow-ups (completed phases)

1. **API fixes:** multer path validation, duplicate pagination removal, boolean coercion in offer/auth services.
2. **Admin cleanup:** Removed knip-ignored dead template files; tightened knip + ESLint.
3. **CI:** Knip job blocks merges (no `continue-on-error`).
4. **Local mongo sanitizer pack:** Custom model pack at `.github/codeql/gogocash-mongo-sanitizers/` is injected in CI via `CODEQL_ACTION_EXTRA_OPTIONS` (`--additional-packs` + `--extension-packs`) on the JS/TS analyze job — `packs:` in `codeql-config.yml` only accepts published GHCR packs. Repo-root [`codeql-workspace.yml`](../codeql-workspace.yml) remains for local CLI use. Native Expo modules (GoGoTrack Kotlin/Swift) use manual builds in [`codeql.yml`](../.github/workflows/codeql.yml) via `expo prebuild` + Gradle / Xcode — there is no repo-root Gradle/Xcode project checked in.

## Related docs

- [`apps/admin/docs/CODE_REVIEW.md`](../apps/admin/docs/CODE_REVIEW.md) — admin PR checklist
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — CI job definitions
