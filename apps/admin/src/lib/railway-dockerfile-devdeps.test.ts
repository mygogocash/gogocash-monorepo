import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

/**
 * Railway injects NODE_ENV=production into Docker builds. Without
 * `--include=dev`, `npm ci` omits typescript (devDependency) and Next.js
 * tries to yarn-install it mid-build → Corepack / packageManager blow-up.
 */
describe("Railway Dockerfiles install build-time deps", () => {
  it("admin Dockerfile > npm ci forces --include=dev so typescript is present", () => {
    const dockerfile = fs.readFileSync(path.join(repoRoot, "apps/admin/Dockerfile"), "utf8");
    expect(dockerfile).toMatch(/npm ci[^\n]*--include=dev/);
    expect(dockerfile).toContain("build:standalone");
  });

  it("api + mobile Railway Dockerfiles > npm ci forces --include=dev", () => {
    const api = fs.readFileSync(path.join(repoRoot, "apps/api/Dockerfile"), "utf8");
    const mobile = fs.readFileSync(
      path.join(repoRoot, "apps/app/Dockerfile.web.railway"),
      "utf8",
    );
    expect(api).toMatch(/npm ci[^\n]*--include=dev/);
    expect(mobile).toMatch(/npm ci[^\n]*--include=dev/);
  });
});
