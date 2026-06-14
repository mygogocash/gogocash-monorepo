# Deploy to Vercel (Project ID: prj_UcjHt1tNVGgsYf3lFUiGiolode4V)

This project is configured to deploy to the Vercel project with **Project ID** `prj_UcjHt1tNVGgsYf3lFUiGiolode4V`.

## One-time setup: authenticate

Choose one of these:

### Option A: Login via CLI (interactive)

```bash
npx vercel login
```

Follow the prompts to log in with your Vercel account.

### Option B: Use a token (CI or script)

1. In Vercel: [Account Settings → Tokens](https://vercel.com/account/tokens)
2. Create a token (e.g. “Admin deploy”).
3. Use it when deploying:

```bash
VERCEL_TOKEN=your_token_here VERCEL_PROJECT_ID=prj_UcjHt1tNVGgsYf3lFUiGiolode4V npx vercel deploy --prod --yes
```

## Deploy

From the project root (`gogocash_admin-main`):

**Production:**

```bash
VERCEL_PROJECT_ID=prj_UcjHt1tNVGgsYf3lFUiGiolode4V npx vercel deploy --prod --yes
```

Or, after linking once (e.g. after `vercel link --project prj_UcjHt1tNVGgsYf3lFUiGiolode4V`):

```bash
npm run deploy
```

**Preview:**

```bash
VERCEL_PROJECT_ID=prj_UcjHt1tNVGgsYf3lFUiGiolode4V npx vercel deploy --yes
```

## Root directory on Vercel

If this repo is part of a monorepo, set **Root Directory** in the Vercel project settings to the folder that contains this Next.js app (e.g. `gogocash_admin-main` or `.` if the repo is this app only).
