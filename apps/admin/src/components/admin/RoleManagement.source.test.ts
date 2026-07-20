import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "RoleManagement.tsx"),
  "utf8",
);

describe("RoleManagement — permission descriptions UX", () => {
  it("uses the human-readable permission catalog instead of raw action verbs", () => {
    expect(source).toContain("permissionsGroupedByCategory");
    expect(source).toContain("applyPermissionToggle");
    expect(source).toContain("PERMISSION_CATEGORY_LABELS");
    expect(source).toContain("ROLE_TEMPLATES");
    expect(source).toContain("RISK_BADGE_CLASSES");
    expect(source).toContain("meta.label");
    expect(source).toContain("meta.description");
    // Old raw verb-only checkbox label must be gone.
    expect(source).not.toContain("{p.split(\":\")[1]}");
  });

  it("shows plug-and-play templates when creating a role", () => {
    expect(source).toContain("Start from a template");
    expect(source).toContain("applyTemplate");
  });

  it("explains view / manage / money actions for non-tech admins", () => {
    expect(source).toContain("View = see the section");
    expect(source).toContain("Manage = create or edit");
    expect(source).toContain("Approve / Refund = money moves");
  });
});
