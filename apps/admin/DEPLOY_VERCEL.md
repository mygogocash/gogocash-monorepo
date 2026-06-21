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

From the admin app folder (`apps/admin` in the `gogocash-monorepo`):

**Production:**

```bash
VERCEL_PROJECT_ID=prj_UcjHt1tNVGgsYf3lFUiGiolode4V npx vercel deploy --prod --yes
```

Or, after linking once (e.g. after `vercel link --project prj_UcjHt1tNVGgsYf3lFUiGiolode4V`),
run `npx vercel deploy --prod --yes` from the linked directory.

> **Note:** there is no `npm run deploy` script in the admin `package.json`; use the
> `npx vercel deploy` commands above (a `vercel.json` is present in `apps/admin`).

**Preview:**

```bash
VERCEL_PROJECT_ID=prj_UcjHt1tNVGgsYf3lFUiGiolode4V npx vercel deploy --yes
```

## Root directory on Vercel

This is a monorepo. Set **Root Directory** in the Vercel project settings to the folder
that contains this Next.js app: **`apps/admin`**.
