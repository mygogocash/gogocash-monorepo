import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf8");

describe("mobile bottom-nav coverage", () => {
  it("the auth screen keeps the bottom nav on mobile so signed-out users are never stranded", () => {
    // Regression: tapping Profile while signed out redirects to /login, which
    // had no bottom nav — the user lost all navigation. Every mobile-shell
    // screen must keep the bar.
    const source = read("screens/CustomerAuthScreen.tsx");
    expect(source).toContain("CustomerMobileBottomNav");
    expect(source).toMatch(/isMobileShell\s*\?\s*\(?\s*<CustomerMobileBottomNav/);
  });

  it("the auth secondary links are centered", () => {
    // "Sign in with email" (and its siblings) rendered left-aligned inside the
    // centered card; the link row must center itself.
    const source = read("screens/CustomerAuthScreen.tsx");
    const block = source.match(/changePhoneButton:\s*\{[\s\S]*?\},/)?.[0] ?? "";
    expect(block).toContain('alignSelf: "center"');
  });
});
