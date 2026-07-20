import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const pickerSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "CategoryIconPicker.tsx"),
  "utf8",
);
const tableSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "PolicyTable.tsx"),
  "utf8",
);
const iconSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "CategoryIcon.tsx"),
  "utf8",
);

describe("CategoryIconPicker — visual gallery", () => {
  it("renders a radiogroup of icon tiles with CategoryIcon glyphs", () => {
    expect(pickerSource).toContain('role="radiogroup"');
    expect(pickerSource).toContain('role="radio"');
    expect(pickerSource).toContain("<CategoryIcon");
    expect(pickerSource).toContain("CATEGORY_ICON_OPTIONS");
    expect(pickerSource).toContain("Selected preview");
  });

  it("supports keyboard radiogroup navigation and focus styles", () => {
    expect(pickerSource).toContain("tabIndex={checked ? 0 : -1}");
    expect(pickerSource).toContain("ArrowRight");
    expect(pickerSource).toContain("ArrowLeft");
    expect(pickerSource).toContain("focus-visible:ring-2");
    expect(pickerSource).toContain("aria-labelledby");
  });

  it("PolicyTable uses CategoryIconPicker instead of a bare text select", () => {
    expect(tableSource).toContain("CategoryIconPicker");
    expect(tableSource).toContain('labelledBy="category-icon-label"');
    expect(tableSource).toContain('id="category-icon-label"');
    expect(tableSource).not.toMatch(
      /<select[\s\S]*Category icon[\s\S]*CATEGORY_ICON_KEYS/,
    );
  });

  it("derives gallery options from the exhaustive key→label map", () => {
    expect(iconSource).toContain("CATEGORY_ICON_OPTIONS");
    expect(iconSource).toContain(
      "as const satisfies Record<CategoryIconKey, string>",
    );
    expect(iconSource).toContain("CATEGORY_ICON_KEYS.map");
  });
});
