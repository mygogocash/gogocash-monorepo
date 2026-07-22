import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Source-pinned wiring for the pre-launch admin feature-flag gate. These assert
 * the gate is wired into every surface directly in source, so a regression that
 * drops a guard (re-exposing a hidden pre-launch surface) fails CI. Behavioural
 * unit coverage of the resolver/filter lives in featureFlags.test.ts.
 */
const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relPath: string): string =>
  readFileSync(resolve(SRC_ROOT, relPath), "utf8");

describe("page guards call notFound() behind the right flag", () => {
  const CASES: Array<{ file: string; flag: string }> = [
    {
      file: "app/(admin)/(others-pages)/credit-score/page.tsx",
      flag: "isCreditScoreEnabled",
    },
    {
      file: "app/(admin)/(others-pages)/membership/page.tsx",
      flag: "isGoGoPassEnabled",
    },
    {
      file: "app/(admin)/(others-pages)/subscription/page.tsx",
      flag: "isGoGoPassEnabled",
    },
    {
      file: "app/(admin)/(others-pages)/gogopass/page.tsx",
      flag: "isGoGoPassEnabled",
    },
  ];

  for (const { file, flag } of CASES) {
    it(`${file} imports notFound and guards on ${flag}`, () => {
      const src = read(file);
      expect(src).toContain('from "next/navigation"');
      expect(src).toContain("notFound");
      expect(src).toContain(flag);
      expect(src).toMatch(new RegExp(`if\\s*\\(!${flag}\\(\\)\\)`));
    });
  }
});

describe("nav surfaces route through filterHiddenAdminItems", () => {
  it("AppSidebarContent filters submenu items", () => {
    const src = read("layout/AppSidebarContent.tsx");
    expect(src).toContain("filterHiddenAdminItems");
    expect(src).toContain('from "@/config/featureFlags"');
  });

  it("UsersManagementTabs filters its nav", () => {
    const src = read("components/user/UsersManagementTabs.tsx");
    expect(src).toContain("filterHiddenAdminItems");
    expect(src).toContain('from "@/config/featureFlags"');
  });
});

describe("WithdrawDetail gates its embedded pre-launch surfaces", () => {
  it("imports the flags and routes the tab list + activeTab through the gate", () => {
    const src = read("components/withdraw/WithdrawDetail.tsx");
    expect(src).toContain('from "@/config/featureFlags"');
    expect(src).toContain("isCreditScoreEnabled");
    expect(src).toContain("isGoGoPassEnabled");
    // Both the tab bar AND the activeTab initializer must consume the filtered
    // list, so a ?tab= deep-link can never strand activeTab on a removed tab.
    expect(src).toMatch(/visibleTabs\.some\(/);
    expect(src).toMatch(/visibleTabs\.map\(/);
  });
});
