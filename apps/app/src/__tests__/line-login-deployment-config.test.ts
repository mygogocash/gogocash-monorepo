import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(__dirname, "../..");
const repoRoot = resolve(appRoot, "../..");

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("LINE Login staging deployment config", () => {
  it("passes the LIFF ID into the Railway Expo web export", () => {
    const dockerfile = readRepoFile("apps/app/Dockerfile.web.railway");

    expect(dockerfile).toContain("ARG EXPO_PUBLIC_LIFF_ID");
    expect(dockerfile).toContain("EXPO_PUBLIC_LIFF_ID=$EXPO_PUBLIC_LIFF_ID");
  });

  it.each([
    ".github/workflows/deploy-app-web-staging.yml",
    ".github/workflows/_build-push.yml",
  ])("passes the staging GitHub variable through %s", (workflowPath) => {
    const workflow = readRepoFile(workflowPath);

    expect(workflow).toContain(
      "EXPO_PUBLIC_LIFF_ID: ${{ vars.EXPO_PUBLIC_LIFF_ID }}",
    );
  });

  it("documents the developing LIFF ID as a Railway build variable", () => {
    const envMatrix = readRepoFile("docs/railway-env-matrix.md");

    expect(envMatrix).toContain(
      "railway variable set 'EXPO_PUBLIC_LIFF_ID=2008237916-KY5oR5mW' --service '@gogocash/mobile' --environment staging",
    );
  });
});
