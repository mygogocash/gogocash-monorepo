# LINE Login channel status (issue #382)

## Symptom

After tapping **Log in** on LINE’s consent screen, the browser lands on `access.line.me` with:

> **400 Bad Request**  
> This channel is now developing status. User need to have developer role.

This happens **on LINE’s servers before control returns to GoGoCash**. The app never receives an OAuth callback for this failure, so it cannot show a friendlier in-app error.

## Root cause

LINE Login channels (and LIFF apps) start in **Developing** status. In that mode only channel **Admin** / **Tester** accounts can complete login. Everyone else gets the 400 above.

Staging currently uses channel / LIFF:

- Channel ID: `2008237916` (`LINE_CHANNEL_ID` on `gogocash-api`)
- LIFF ID: `2008237916-KY5oR5mW` (`EXPO_PUBLIC_LIFF_ID` on `@gogocash/mobile`)

See [railway-env-matrix.md](./railway-env-matrix.md).

## Fix (LINE Developers Console — required)

Someone with Admin on the LINE provider must do **one** of the following:

### A) Allow all end users (staging/public QA)

1. Open [LINE Developers Console](https://developers.line.biz/console/).
2. Open provider → **LINE Login** channel `2008237916`.
3. Click channel status **Developing** at the top → change to **Published**.  
   - This is **permanent** for the Login channel (cannot revert to Developing).
4. Open the **LIFF** tab → open LIFF `2008237916-KY5oR5mW` → set LIFF app to **Published** as well.
5. Retest LINE sign-in with a normal LINE account (not a developer).

### B) Keep Developing (internal QA only)

1. Channel → **Roles** → invite the tester’s Business ID email as **Tester** (or Admin).
2. That person must link their Business ID to the LINE account they use for login.
3. Retest with that linked LINE account.

Official docs: [Getting started with LINE Login — Publish your channel](https://developers.line.biz/en/docs/line-login/getting-started/), [Managing roles](https://developers.line.biz/en/docs/line-developers-console/managing-roles/).

## Not a GoGoCash code bug

Callback handoff, LIFF Endpoint URL, and `LINE_CHANNEL_ID` matching are separate concerns (covered by prior LINE callback PRs). This specific 400 is channel publication / role gating on LINE’s side.
