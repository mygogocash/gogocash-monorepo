import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const formSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "FeeForm.tsx"),
  "utf8",
);

describe("FeeForm — System section save (founder feedback)", () => {
  it("renders a Save control inside the System section, not only at the bottom", () => {
    // Founder: 'on fee structure should have save button as well'. The System
    // (platform fee) block sat far above the only Save button (bottom of the
    // long country list), so it looked unsaveable. A Save control must appear
    // within the System section.
    const systemSection = formSource.slice(
      formSource.indexOf("Global platform fee and optional"),
      formSource.indexOf("Withdrawal fees by country"),
    );
    expect(systemSection).toContain("Save platform fee");
  });

  it("the System-section Save reuses saveSettings and the dirty/loaded guard", () => {
    expect(formSource).toMatch(
      /onClick=\{\(\) => void saveSettings\(\)\}[\s\S]*?disabled=\{saving \|\| fetching \|\| !forms\.id \|\| !dirty\}[\s\S]*?Save platform fee/,
    );
  });
});
