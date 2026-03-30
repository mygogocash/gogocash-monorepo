# Deploy to Cloudflare Pages (internal demo)

This project is set up to deploy to **Cloudflare** (Workers/Pages) using [OpenNext](https://opennext.js.org/cloudflare).

## Build settings for Cloudflare (Git / Workers Builds)

If you connect this repo to Cloudflare via Git or use Workers Builds, set these in the project’s **Build configuration** so the job uses **npm** (not Yarn) and the correct commands:

| Setting            | Value              |
|--------------------|--------------------|
| **Install command**| `npm ci`           |
| **Build command**  | `npm run build:cf` |
| **Build output dir** | (leave default; Wrangler uses `.open-next`) |

- The project uses **npm** and `package-lock.json`. Do not use Yarn in CI or the install will fail (lockfile immutable).
- Root directory: set only if this app lives in a subdirectory of the repo.

## One-time setup

1. **Log in to Cloudflare** (if needed):
   ```bash
   npx wrangler login
   ```

2. **Set your Cloudflare account ID** (required if you have more than one account):
   - Option A: In `wrangler.toml`, uncomment and set `account_id = "YOUR_ACCOUNT_ID"`.
   - Option B: When deploying, set the env var:
     ```bash
     CLOUDFLARE_ACCOUNT_ID=your_account_id npm run deploy:cf
     ```
   - Find your Account ID in [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → right-hand sidebar.

## Deploy

From the project root:

```bash
# Build and deploy to Cloudflare
npm run deploy:cf
```

Or with account ID:

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id npm run deploy:cf
```

After a successful deploy, Wrangler will print your app URL (e.g. `https://gogocash-admin-demo.<subdomain>.workers.dev` or your custom domain).

## Other commands

- **Build only** (no deploy): `npm run build:cf`
- **Preview locally** (Workers runtime): `npm run preview:cf`

## Environment variables

For production (e.g. NextAuth, API URL), configure [Cloudflare Workers env vars](https://developers.cloudflare.com/workers/configuration/environment-variables/) in the dashboard or in `wrangler.toml` under `[vars]` (non-secret) and **Settings → Variables and Secrets** (secrets).
