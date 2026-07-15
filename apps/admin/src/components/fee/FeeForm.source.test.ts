import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const formSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "FeeForm.tsx"),
  "utf8",
);

describe("FeeForm — cashback section save (founder feedback)", () => {
  it("renders a Save control inside cashback management, not only at the bottom", () => {
    const cashbackSection = formSource.slice(
      formSource.indexOf("Cashback transaction fee management"),
      formSource.indexOf("Withdrawal fee management"),
    );
    expect(cashbackSection).toContain("Save cashback fees");
  });

  it("the cashback Save reuses saveSettings and the dirty/loaded guard", () => {
    expect(formSource).toMatch(
      /onClick=\{\(\) => void saveSettings\(\)\}[\s\S]*?disabled=\{saving \|\| fetching \|\| !forms\.id \|\| !dirty\}[\s\S]*?Save cashback fees/,
    );
  });
});
