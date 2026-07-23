import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const tableSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "PolicyTable.tsx"),
  "utf8",
);

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

  it("the category-name input shows live validation and the unified save blocks invalid drafts", () => {
    expect(tableSource).toContain("categoryNameError");
    expect(tableSource).toContain('role="alert"');
    expect(tableSource).toContain("autoFocus");
  });

  it("does not retain any category-only create or rename request", () => {
    expect(tableSource).not.toContain('"/admin/create-category"');
    expect(tableSource).not.toContain("/offer/create-category");
    expect(tableSource).not.toContain("createCategoryErrorMessage");
    expect(tableSource).not.toContain("fetcherPost");
  });

  it("sends the normalized name only through the aggregate command", () => {
    expect(tableSource).toContain("normalizedName");
    expect(tableSource).toContain('client.put("/policy/aggregate"');
  });
});

describe("PolicyTable — unified new-policy editor (#335–#337, source signals)", () => {
  it("opens empty terms and banner text in edit mode and marks new terms required", () => {
    expect(tableSource).toContain("setEditingTerms(!hasTerms)");
    expect(tableSource).toContain("setEditingBanner(!hasBannerText)");
    expect(tableSource).toContain("NEW_POLICY_TERMS_REQUIRED_MESSAGE");
    expect(tableSource).toMatch(/aria-hidden="true">\s*\*\s*<\/span>/);
  });

  it("uses one editor-level Save and one aggregate request", () => {
    expect(tableSource).toContain('client.put("/policy/aggregate"');
    expect(tableSource).not.toContain(
      'client.put("/policy", savePlan.payload)',
    );
    expect(tableSource).not.toContain('void handleSave("terms"');
    expect(tableSource).not.toContain('void handleSave("banner"');
    expect(tableSource.match(/Save changes/g)).toHaveLength(1);
  });

  it("uploads the one selected Default banner from the same aggregate action", () => {
    expect(tableSource).toContain("defaultBanner: defaultUpload?.file");
    expect(tableSource).not.toContain("bannerForm.append");
    expect(tableSource).not.toContain("saved automatically");
  });

  it("saves optional custom icon image after aggregate via update-category", () => {
    expect(tableSource).toContain("customIconUpload");
    expect(tableSource).toContain(
      "`/admin/update-category/${savedCategory._id}`",
    );
    expect(tableSource).toContain('iconForm.append("image"');
  });

  it("keeps the policy banner as localized text, not a phantom second file", () => {
    expect(tableSource).toContain('aria-label="Policy banner text"');
    // Banner file lives in PolicyTable; custom icon file lives in CategoryIconPicker.
    expect(tableSource.match(/type="file"/g)).toHaveLength(1);
    expect(tableSource).toContain("onCustomIconChange");
  });
});
