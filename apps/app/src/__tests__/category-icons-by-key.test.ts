import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source contract test — importing `@mobile/theme/categoryIcons` pulls Phosphor /
 * RN icon modules that Vitest's node env cannot parse (`Unexpected token 'typeof'`).
 * Assert the Phase C icon_key surface from source instead.
 */
const categoryIconsSource = readFileSync(
  path.resolve(__dirname, "../theme/categoryIcons.ts"),
  "utf8",
);

describe("categoryIcons > icon_key parity with admin Policy Management", () => {
  it("exports the expanded 18-key admin/API allow-list", () => {
    for (const key of [
      "shopping",
      "travel",
      "food",
      "finance",
      "entertainment",
      "electronics",
      "fashion",
      "beauty",
      "health",
      "home",
      "education",
      "gift",
      "sports",
      "pets",
      "baby",
      "auto",
      "services",
      "default",
    ]) {
      expect(categoryIconsSource).toContain(`"${key}"`);
    }

    const keysBlock = categoryIconsSource.match(
      /export const CATEGORY_ICON_KEYS = \[([\s\S]*?)\] as const/,
    )?.[1];
    expect(keysBlock).toBeTruthy();
    const keyCount = (keysBlock?.match(/"/g) ?? []).length / 2;
    expect(keyCount).toBe(18);
  });

  it("maps every allow-listed key in categoryIconsByKey", () => {
    expect(categoryIconsSource).toContain(
      "export const categoryIconsByKey: Record<CategoryIconKey, IconComponent>",
    );
    for (const key of [
      "gift",
      "sports",
      "pets",
      "baby",
      "auto",
      "services",
      "default",
    ]) {
      expect(categoryIconsSource).toMatch(new RegExp(`${key}:\\s*\\w+`));
    }
  });

  it("getCategoryIcon prefers resolveCategoryIconKey over the label map", () => {
    expect(categoryIconsSource).toContain("export function resolveCategoryIconKey");
    expect(categoryIconsSource).toMatch(
      /export function getCategoryIcon\(\s*category: string,\s*iconKey\?: string \| null,/,
    );
    expect(categoryIconsSource).toContain("const key = resolveCategoryIconKey(iconKey)");
    expect(categoryIconsSource).toContain("return categoryIconsByKey[key]");
    expect(categoryIconsSource).toContain(
      "return categoryIcons[category] ?? Store",
    );
  });
});
