import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const monorepoRoot = path.resolve(adminRoot, "../..");
const appsRoot = path.join(monorepoRoot, "apps");

const SOURCE_DIR_NAMES = ["src", "lib"] as const;
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs)$/;
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/;

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") {
        continue;
      }
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (SOURCE_EXTENSIONS.test(entry.name) && !TEST_FILE_PATTERN.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectMonorepoAppSourceFiles(): string[] {
  if (!fs.existsSync(appsRoot)) return [];

  const files: string[] = [];
  for (const appEntry of fs.readdirSync(appsRoot, { withFileTypes: true })) {
    if (!appEntry.isDirectory()) continue;

    for (const dirName of SOURCE_DIR_NAMES) {
      files.push(...collectSourceFiles(path.join(appsRoot, appEntry.name, dirName)));
    }
  }

  return files;
}

describe("monorepo secret hygiene", () => {
  it("given apps/* source > then no Google API keys are hardcoded", () => {
    const googleApiKey = /\bAIzaSy[A-Za-z0-9_-]{20,}\b/g;
    const findings: string[] = [];

    for (const file of collectMonorepoAppSourceFiles()) {
      const content = fs.readFileSync(file, "utf8");
      googleApiKey.lastIndex = 0;
      if (googleApiKey.test(content)) {
        findings.push(path.relative(monorepoRoot, file));
      }
    }

    expect(findings).toEqual([]);
  });
});
