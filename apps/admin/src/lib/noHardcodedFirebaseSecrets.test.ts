import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("admin secret hygiene", () => {
  it("given admin source > then no Google API keys are hardcoded", () => {
    const googleApiKey = /\bAIzaSy[A-Za-z0-9_-]{20,}\b/g;
    const findings: string[] = [];

    for (const file of collectSourceFiles(path.join(adminRoot, "src"))) {
      const content = fs.readFileSync(file, "utf8");
      googleApiKey.lastIndex = 0;
      if (googleApiKey.test(content)) {
        findings.push(path.relative(adminRoot, file));
      }
    }

    expect(findings).toEqual([]);
  });
});
