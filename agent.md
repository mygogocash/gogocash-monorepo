# Working Agreement for AI Agents on this Repo

Read this before editing. See `project.md` (layout), `context.md` (status), `design.md` (design system).

## 1. TDD is mandatory (RED → GREEN → commit)
Every parity fix: extend a failing test → see it fail for the right reason → minimal production change → `tsc` clean → full suite green → commit. One logical fix per commit. Never commit red. Never write a commit message claiming "passed/green" unless you observed it in that same sequence — the auto-mode classifier blocks fabricated verification (it has fired here, correctly).

## 2. Tests are SOURCE-STRING assertions, not render tests
`apps/mobile/src/__tests__/*.test.ts` use `readFileSync(<source file>) + expect(content).toContain("…")` / `.not.toContain(…)`. They do NOT render React. A `readMobileFile("relative/path")` helper resolves paths relative to `apps/mobile`. Shared visual data lives in `src/design/webDesignParity.ts`. Tests assert the screen references the right fixture + renders the right strings/styles.
- To show RED when production is already applied: `git stash push -- <prod files>`, run the test (confirm it fails for the right reason), `git stash pop`.
- Tests run in parallel; an occasional one-off cross-file failure ("profile page") is a flake — re-run to confirm before reacting.

## 3. Commands
```
cd apps/mobile
npx tsc --noEmit                                            # 0 errors
npx vitest run --config vitest.config.ts                   # full suite (green baseline 243 pass / 7 todo)
npx vitest run --config vitest.config.ts src/__tests__/X.test.ts   # one file
```

## 4. Parity discipline
- Ground-truth EVERY claimed gap against the real web file (`gogocash_app-staging/src/**`) AND the real Expo file first. Audit ~50% false positives.
- Pull web copy VERBATIM. Resolve `t("…")` keys against `gogocash_app-staging/src/messages/en.json`. Do NOT invent or paraphrase copy — reconstructions have been wrong.
- Use tokens from `src/theme/tokens.ts`, not hardcoded values, except matching an exact web hex the tokens lack.

## 5. Editing safely
- Before any anchor-based Edit, confirm the find-string occurs **exactly once** in the CURRENT file; after, confirm old gone / new present.
- Do NOT retype existing JSX from memory to build a replacement — EXTRACT the real block (a wrong retype shipped a broken commit here).
- Watch for DUPLICATE style keys: a screen may already define `sectionBody` etc.; adding it again gives TS1117. Grep the key first.
- For a NEW component file, `tsc` passing is NOT enough — verify it's actually imported (`tsc --noEmit --listFiles | grep <file>`) and every used identifier is imported; orphaned files are silently skipped.

## 6. ⚠️ ENVIRONMENT GOTCHAS (these cost real time here)
### a. `rtk` corrupts tool output
A user-global PreToolUse Bash hook (`rtk hook claude`, a token optimizer) corrupts output — Bash stdout AND the Read tool: duplicated lines, injected tokens, truncation, stale values. Each call may print `[from rtk-rewrite hook] … exit 2`. Disabling it in `~/.claude/settings.json` does NOT take effect mid-session (hooks load at session start) — **restart the session for a clean env.**
Reliable workarounds while active: read true bytes via base64 round-trip (`node -e '…Buffer.from(x).toString("base64")' | base64 -d`); reduce checks to **process exit codes** (`process.exit(count)` + `echo "X=$?"`, pack booleans into bits); trust a follow-up grep/exit-code over the displayed Edit/Write echo; for git use `node --input-type=module` + `execFileSync("git",[...])`.

### b. Do NOT batch dependent tool calls
The harness CANCELS the entire batch on the first error, and earlier in-batch results display as if final → hallucinated "committed/pushed/green" claims. **One operation per message** when steps depend on each other. This was the single biggest time sink in this project's history.

## 7. Git / deploy
- Branch `expo-module`; remote `origin` = github.com/mygogocash/gogocash_app.git.
- Stage only the specific files you changed (never `git add -A`; leave the pre-existing unstaged `D Dockerfile`).
- **Do not push or deploy without explicit user sign-off.** Held-back commits stay local. Forward-fix over force-push for anything already on the remote. To drop a just-made bad LOCAL commit, `git reset --soft HEAD~1` (safe; never on pushed history).
