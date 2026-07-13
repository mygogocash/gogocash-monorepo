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
