import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const tableSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "PolicyTable.tsx"),
  "utf8",
);

describe("PolicyTable — category create targets the real API (#277, source signals)", () => {
  it("#277 > create posts to /admin/create-category (the route that exists)", () => {
    expect(tableSource).toContain('"/admin/create-category"');
  });

  it("#277 > no call remains to the nonexistent /offer/create-category", () => {
    expect(tableSource).not.toContain("/offer/create-category");
  });

  it("#277 > create failures toast via createCategoryErrorMessage (HTTP status in fallback)", () => {
    expect(tableSource).toContain("createCategoryErrorMessage(err)");
  });
});

describe("PolicyTable — unsaved category draft (#318, source signals)", () => {
  it("Create New opens a blank local draft without persisting a placeholder", () => {
    const createHandler = tableSource.slice(
      tableSource.indexOf("const handleCreateCategory"),
      tableSource.indexOf("const beginEditName"),
    );

    expect(createHandler).toContain("setCreatingCategoryDraft(true)");
    expect(createHandler).toContain('setNameDraft("")');
    expect(createHandler).not.toContain("fetcherPost");
    expect(tableSource).not.toContain('name: "New category"');
  });

  it("the category-name input shows live validation and blocks invalid saves", () => {
    expect(tableSource).toContain("categoryNameError");
    expect(tableSource).toContain('role="alert"');
    expect(tableSource).toMatch(
      /disabled=\{savingName \|\| Boolean\(categoryNameError\)\}/,
    );
    expect(tableSource).toContain("autoFocus");
  });

  it("the save path creates once with the real trimmed name and surfaces backend races", () => {
    const saveHandler = tableSource.slice(
      tableSource.indexOf("const saveName"),
      tableSource.indexOf("const autoSaveBanner"),
    );
    expect(tableSource).toContain('"/admin/create-category"');
    expect(tableSource).toContain("normalizedName");
    expect(tableSource).toContain("createCategoryErrorMessage(err)");
    expect(saveHandler.match(/fetcherPost/g)).toHaveLength(1);
    expect(saveHandler).toContain("creatingRef.current");
  });
});
