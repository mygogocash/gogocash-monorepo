import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CATEGORY_ICON_KEYS,
  CATEGORY_ICON_OPTIONS,
} from "./CategoryIcon";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../../");

function extractStringArrayLiteral(source: string, exportName: string): string[] {
  const match = source.match(
    new RegExp(
      `export const ${exportName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`,
    ),
  );
  if (!match) {
    throw new Error(`Could not find export const ${exportName} = [...] as const`);
  }
  // Admin/app use double quotes; API Nest sources often use single quotes.
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

describe("CATEGORY_ICON_KEYS cross-package sync", () => {
  it("admin OPTIONS covers every allow-listed key exactly once", () => {
    expect(CATEGORY_ICON_OPTIONS.map((option) => option.key)).toEqual([
      ...CATEGORY_ICON_KEYS,
    ]);
  });

  it("matches API category.schema.ts allow-list", () => {
    const apiSource = readFileSync(
      resolve(repoRoot, "apps/api/src/offer/schemas/category.schema.ts"),
      "utf8",
    );
    expect(extractStringArrayLiteral(apiSource, "CATEGORY_ICON_KEYS")).toEqual([
      ...CATEGORY_ICON_KEYS,
    ]);
  });

  it("matches customer app categoryIcons.ts allow-list", () => {
    const appSource = readFileSync(
      resolve(repoRoot, "apps/app/src/theme/categoryIcons.ts"),
      "utf8",
    );
    expect(extractStringArrayLiteral(appSource, "CATEGORY_ICON_KEYS")).toEqual([
      ...CATEGORY_ICON_KEYS,
    ]);
  });

  it("mockApiCore imports CATEGORY_ICON_KEYS instead of re-listing keys", () => {
    const mockSource = readFileSync(
      resolve(repoRoot, "apps/admin/src/lib/mockApiCore.ts"),
      "utf8",
    );
    expect(mockSource).toContain(
      'import { CATEGORY_ICON_KEYS } from "@/components/policy/CategoryIcon"',
    );
    expect(mockSource).toContain(
      "(CATEGORY_ICON_KEYS as readonly string[]).includes(iconKey)",
    );
  });
});
