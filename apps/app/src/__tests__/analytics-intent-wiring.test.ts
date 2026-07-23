import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Phase D — wire the previously-dead client intent helpers onto their user-action
// call sites, plus mobile search parity. Source-scan wiring tests (same style as
// analytics-promotion-wiring.test.ts): the helper BEHAVIOR is proven in
// analytics-events.test.ts; here we prove each call site imports the analytics
// hook + helper and invokes it with the web-parity property names. RED first,
// because none of these calls exist today.

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("category_select wiring (CategoryDirectoryCard)", () => {
  const source = readSource("src/screens/discovery/CategoryDirectoryCard.tsx");

  it("imports the analytics hook and the category helper", () => {
    expect(source).toContain("trackCategorySelect");
    expect(source).toContain('from "@mobile/analytics/events"');
    expect(source).toContain("useAnalytics");
    expect(source).toContain('from "@mobile/analytics/useAnalytics"');
  });

  it("fires trackCategorySelect on the category Link press with web-parity props", () => {
    expect(source).toMatch(/onPress=\{\(\)\s*=>\s*trackCategorySelect\(/);
    expect(source).toMatch(/trackCategorySelect\(\s*analytics/);
    expect(source).toContain("categoryName: category.title");
    expect(source).toContain("source:");
  });
});

describe("quest_started wiring (CustomerQuestScreen)", () => {
  const source = readSource("src/screens/CustomerQuestScreen.tsx");

  it("imports the analytics hook and the quest helper", () => {
    expect(source).toContain("trackQuestStarted");
    expect(source).toContain('from "@mobile/analytics/events"');
    expect(source).toContain("useAnalytics");
    expect(source).toContain('from "@mobile/analytics/useAnalytics"');
  });

  it("fires trackQuestStarted when a quest task row is started (Link press)", () => {
    expect(source).toMatch(/onPress=\{\(\)\s*=>\s*trackQuestStarted\(/);
    expect(source).toMatch(/trackQuestStarted\(\s*analytics/);
  });
});

describe("cashback_withdraw_success wiring (CustomerMoneyActionScreen)", () => {
  const source = readSource("src/screens/CustomerMoneyActionScreen.tsx");

  it("imports the analytics hook and the withdraw helper", () => {
    expect(source).toContain("trackCashbackWithdrawSuccess");
    expect(source).toContain('from "@mobile/analytics/events"');
    expect(source).toContain("useAnalytics");
    expect(source).toContain('from "@mobile/analytics/useAnalytics"');
  });

  it("fires trackCashbackWithdrawSuccess with value/currency/method from the confirmed withdrawal", () => {
    expect(source).toMatch(/trackCashbackWithdrawSuccess\(\s*analytics/);
    expect(source).toContain("amount: decision.amount");
    expect(source).toContain('currency: "THB"');
    expect(source).toContain("method: withdrawMethod");
  });

  it("does NOT pass any account number into the analytics payload", () => {
    // The call must never carry accountNo/accountNumber (PII).
    const callBlocks = source.match(/trackCashbackWithdrawSuccess\(analytics,\s*\{[^}]*\}/g) ?? [];
    expect(callBlocks.length).toBeGreaterThan(0);
    for (const block of callBlocks) {
      expect(block).not.toMatch(/account/i);
    }
  });
});

describe("complete_registration wiring (CustomerAuthScreen)", () => {
  const source = readSource("src/screens/CustomerAuthScreen.tsx");

  it("imports the analytics hook and the registration helper", () => {
    expect(source).toContain("trackCompleteRegistration");
    expect(source).toContain('from "@mobile/analytics/events"');
    expect(source).toContain("useAnalytics");
    expect(source).toContain('from "@mobile/analytics/useAnalytics"');
  });

  it("fires trackCompleteRegistration only for a newly-created account (is_new_user)", () => {
    expect(source).toMatch(/trackCompleteRegistration\(\s*analytics/);
    // The registration event must be gated on the backend's is_new_user flag so it
    // fires on account creation, not on every sign-in.
    expect(source).toContain("is_new_user");
  });
});

describe("mobile search_open/search_submit wiring (CustomerSearchScreen)", () => {
  const source = readSource("src/screens/CustomerSearchScreen.tsx");

  it("imports the analytics hook and both search helpers", () => {
    expect(source).toContain("trackSearchOpen");
    expect(source).toContain("trackSearchSubmit");
    expect(source).toContain('from "@mobile/analytics/events"');
    expect(source).toContain("useAnalytics");
    expect(source).toContain('from "@mobile/analytics/useAnalytics"');
  });

  it("fires search_open and search_submit from the mobile search surface", () => {
    expect(source).toMatch(/trackSearchOpen\(\s*analytics/);
    expect(source).toMatch(/trackSearchSubmit\(\s*analytics/);
  });

  it("keeps search_submit sending the user's query term (existing property policy)", () => {
    expect(source).toMatch(/trackSearchSubmit\(analytics,\s*\{[^}]*query:/);
  });
});
