import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Next.js 16.2.x probes `typescript/lib/typescript.js` (Compiler API).
 * TypeScript 7 (native Go port) drops that file, so `next build` falsely
 * reports "TypeScript not installed". Keep admin on TS 5.9 until Next ships
 * `experimental.useTypeScriptCli` in our pinned next version.
 */
describe("admin TypeScript pin for Next build", () => {
  it("package.json > pins typescript to 5.9.x (not 7)", () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "../../package.json"), "utf8"),
    ) as { devDependencies: { typescript: string } };
    expect(pkg.devDependencies.typescript).toMatch(/^~5\.9\./);
  });
});
