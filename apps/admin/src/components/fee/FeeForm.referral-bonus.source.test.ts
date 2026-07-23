import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const formSource = readFileSync(resolve(here, "FeeForm.tsx"), "utf8");
const apiTypes = readFileSync(
  resolve(here, "..", "..", "types", "api.ts"),
  "utf8",
);

describe("FeeForm — referral bonus %", () => {
  it("renders a Referral bonus % input bound to forms.referral_bonus_percent", () => {
    expect(formSource).toContain("Referral bonus %");
    expect(formSource).toMatch(
      /value=\{forms\.referral_bonus_percent\}[\s\S]*?referral_bonus_percent: parseNum\(e\.target\.value\)/,
    );
  });

  it("hydrates referral_bonus_percent from the API response (with a 10% fallback)", () => {
    expect(formSource).toMatch(
      /referral_bonus_percent: res\.referral_bonus_percent \?\? 10/,
    );
  });

  it("carries referral_bonus_percent on both fee types so the save payload includes it", () => {
    // payload spreads `...forms`, so the field must exist on FeeSettingsForm.
    expect(apiTypes).toMatch(/referral_bonus_percent: number;/);
    expect(apiTypes).toMatch(/referral_bonus_percent\?: number;/);
  });
});
