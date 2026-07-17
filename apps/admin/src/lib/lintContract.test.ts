import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const adminRoot = process.cwd();
const eslintBin = resolve(
  dirname(require.resolve("eslint/package.json")),
  "bin/eslint.js",
);
const configPath = resolve(adminRoot, "eslint.react-contract.config.mjs");
const invalidConfigPath = resolve(
  adminRoot,
  "lint-fixtures/invalid-react-contract.config.mjs",
);

const contracts = [
  ["directive-text-purity.tsx", "react-hooks/purity"],
  ["purity.tsx", "react-hooks/purity"],
  ["refs.tsx", "react-hooks/refs"],
  ["set-state-in-effect.tsx", "react-hooks/set-state-in-effect"],
  ["static-components.tsx", "react-hooks/static-components"],
] as const;

type EslintDiagnostic = {
  fatal?: boolean;
  ruleId: string | null;
  severity: number;
};

type EslintReport = {
  fatalErrorCount: number;
  messages: EslintDiagnostic[];
};

function runEslintPath(filePath: string, selectedConfigPath = configPath) {
  return spawnSync(
    process.execPath,
    [eslintBin, "--config", selectedConfigPath, filePath, "--format", "json"],
    { cwd: adminRoot, encoding: "utf8" },
  );
}

function runEslint(fixtureName: string, selectedConfigPath = configPath) {
  return runEslintPath(
    resolve(adminRoot, "lint-fixtures/react-hooks", fixtureName),
    selectedConfigPath,
  );
}

describe("Admin React correctness lint contract", () => {
  it.each(contracts)("rejects %s with %s", (fixtureName, expectedRuleId) => {
    const result = runEslint(fixtureName);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");

    const parsed: unknown = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);

    const reports = parsed as EslintReport[];
    expect(reports).toHaveLength(1);
    expect(reports.every((report) => report.fatalErrorCount === 0)).toBe(true);

    const diagnostics = reports.flatMap((report) => report.messages);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.every((diagnostic) => !diagnostic.fatal)).toBe(true);
    expect(
      diagnostics.every(
        (diagnostic) =>
          diagnostic.severity === 2 && diagnostic.ruleId === expectedRuleId,
      ),
    ).toBe(true);
  });

  it("rejects an invalid rule configuration as a config error, not a lint finding", () => {
    const result = runEslint("purity.tsx", invalidConfigPath);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("react-hooks/not-a-real-rule");
  });

  it("accepts the real disabled Next image directive without a config error", () => {
    const result = runEslintPath(
      resolve(
        adminRoot,
        "src/components/missing-orders/MissingOrdersManagement.tsx",
      ),
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");

    const parsed: unknown = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);

    const reports = parsed as EslintReport[];
    expect(reports).toHaveLength(1);
    expect(reports[0]?.fatalErrorCount).toBe(0);
    expect(reports[0]?.messages).toEqual([]);
  });
});
