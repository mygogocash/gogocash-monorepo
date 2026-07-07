import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const offersTableSource = readFileSync(
  resolve(__dirname, "OffersTable.tsx"),
  "utf8",
);

describe("OffersTable delete action", () => {
  it("uses ConfirmDialog instead of window.confirm for delete", () => {
    expect(offersTableSource).toContain("ConfirmDialog");
    expect(offersTableSource).toContain("openDeleteConfirm");
    expect(offersTableSource).not.toMatch(
      /confirm\(\s*["']Are you sure you want to delete this offer\?/,
    );
  });

  it("surfaces API delete failures via toast", () => {
    expect(offersTableSource).toContain("getApiErrorMessage");
    expect(offersTableSource).toContain('toast.error(getApiErrorMessage(err, "Could not delete offer.")');
  });

  it("warns that delete is permanent and cannot be undone", () => {
    expect(offersTableSource).toContain("Permanently delete");
    expect(offersTableSource).toContain("cannot be undone");
  });
});
