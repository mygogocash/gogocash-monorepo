# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Static-export Next.js 16 marketing site for GoGoCash (cashback rewards). No backend, no database — purely static pages served from Firebase Hosting in production. See `README.md` for full architecture and npm script reference.

### Node version

Requires **Node.js 20.x** (pinned in `.nvmrc` and `package.json` `engines`). Activate with `source ~/.nvm/nvm.sh && nvm use 20` if the default shell version differs.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm ci` (runs `patch-package` via `postinstall`) |
| Dev server | `npm run dev` (Turbopack, port 3000) |
| Lint | `npm run lint` |
| Unit tests | `npm run test` |
| Typecheck | `npm run typecheck` |
| Full gate | `npm run verify` (lint + test + typecheck + build) |
| Static build | `npm run build` (output in `out/`) |
| E2E tests | `npm run test:e2e` (requires dev server running; install browsers first with `npx playwright install --with-deps chromium webkit`) |

### Gotchas

- **E2E tests need a running dev server.** Start `npm run dev` in a separate terminal/tmux session before running `npm run test:e2e`. The Playwright config reuses the dev server on port 3000.
- **Playwright browsers must be installed** with `npx playwright install --with-deps chromium webkit` on first setup. The `--with-deps` flag is essential on Linux to pull WebKit system libraries.
- **No environment variables are required** for local dev. All optional secrets (Involve Asia, Strapi, Firebase) fall back to sensible defaults. See `.env.example` for reference.
- **`patch-package`** applies a Tailwind CSS patch automatically on install. If you see Tailwind issues after upgrading, check `patches/tailwindcss+3.4.18.patch`.
- **Static export only:** `next start` is not used in production. Always validate with `npm run build` since the live site is `output: "export"` static HTML.
