# Git commit messages and changelogs

Practical conventions for this repo: readable history, easier reviews, and release notes that match what shipped.

---

## 1. Commit messages

### Subject line (first line)

- **~50–72 characters**, imperative mood: *Add*, *Fix*, *Refactor*, not *Added* / *Fixes*.
- **Capitalize** the first word after the type; no trailing period on the subject.
- **One logical change** per commit when possible (easier to revert and to cherry-pick).

**Recommended: Conventional Commits** (works well with automation and changelog grouping):

```text
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

Common **types**:

| Type | Use for |
|------|---------|
| `feat` | New user-visible behavior |
| `fix` | Bug fixes |
| `docs` | Documentation only |
| `chore` | Tooling, deps, config without app behavior change |
| `refactor` | Code change without fixing a bug or adding a feature |
| `perf` | Performance |
| `test` | Tests only |
| `ci` | CI / pipeline |

**Examples:**

```text
fix(offers): open edit modal on row click instead of action menu

Users expected a single click to edit; intermediate modal removed.
View detail remains under Actions.

feat(auth): gate mock password login to development only
```

### Body (optional)

- Explain **why**, not only what, when the subject is not enough.
- Wrap at ~72 characters for terminal readability.

### Footer (optional)

- **Breaking changes:** `BREAKING CHANGE: describe migration`
- **Issues:** `Fixes #123` (if your host links these)

### What to avoid

- Vague subjects: `update`, `fix bug`, `wip`, `changes`.
- Mixing unrelated edits in one commit (e.g. format whole repo + feature).
- Secrets, tokens, or real customer data in messages or diffs.

---

## 2. Changelogs

Two audiences:

| Audience | Best format |
|----------|-------------|
| **Users / stakeholders** | Short, outcome-focused bullets (see repo `CHANGELOG.md`) |
| **Developers** | `git log` with good commit messages |

### Keep a Changelog (this repo)

- Maintain **`CHANGELOG.md`** at the root.
- New work goes under **`[Unreleased]`** until you cut a release.
- On release: rename `[Unreleased]` to a version + date, add a new empty `[Unreleased]` at the top.
- Group entries: **Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**, **Security**.

### Turning commits into draft notes

After you use conventional commits for a while:

```bash
# Recent commits (manual polish into CHANGELOG)
git log -30 --no-merges --pretty=format:'%h %s'

# Since last tag (if you use tags)
git log "$(git describe --tags --abbrev=0 2>/dev/null)"..HEAD --no-merges --pretty=format:'- %s (%h)'
```

Polish the output: drop noise (`chore: bump`), merge related lines, rewrite for **user impact**.

### Optional automation (later)

- **commitlint** + **husky**: enforce message format on `commit-msg`.
- **release-it**, **standard-version**, or **semantic-release**: bump version, tag, and append to `CHANGELOG.md` from conventional commits.

Add those only when the team agrees on the format; the habits above pay off even without tooling.

---

## 3. Release checklist (short)

1. Move `[Unreleased]` items into a dated version section in `CHANGELOG.md`.
2. Bump `package.json` version if you publish artifacts from it.
3. Tag: `git tag -a v2.0.3 -m "Release v2.0.3"`.
4. Publish / deploy per your runbook.

---

## 4. PR descriptions

Tie PRs to the changelog mindset:

- **What** changed and **why**.
- **How to test** (or “N/A” for docs-only).
- Link issues or tickets.

That makes squash-merge subjects easier to write and keeps release notes honest.
