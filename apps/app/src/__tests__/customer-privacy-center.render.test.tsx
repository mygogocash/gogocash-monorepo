import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerPrivacyCenterScreen } from "@mobile/screens/CustomerPrivacyCenterScreen";

// Render coverage for the PDPA Consent Preferences screen (/privacy-center) — parity with
// the Next.js privacy-center page. This screen previously had NO dedicated test. It mounts
// the screen (react-native -> react-native-web, happy-dom) and asserts the real consent
// copy + the accept-all control, plus a source signal that it draws its design from the
// shared webPrivacyCenterPage parity module (not hardcoded strings).
const privacyCenterSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerPrivacyCenterScreen.tsx"),
  "utf8",
);

describe("CustomerPrivacyCenterScreen (render)", () => {
  it("mounts without throwing under the harness", () => {
    expect(() => render(createElement(CustomerPrivacyCenterScreen))).not.toThrow();
  });

  it("renders the consent-preferences copy + the accept-all control + optional toggles", () => {
    render(createElement(CustomerPrivacyCenterScreen));
    expect(screen.getByText("Consent preferences")).toBeTruthy();
    expect(screen.getByText("Get the full GoGoCash experience")).toBeTruthy();
    expect(screen.getByText("Accept all optional consents")).toBeTruthy();
    expect(screen.getByText("Optional data uses")).toBeTruthy();
    expect(screen.getByText("Marketing communications")).toBeTruthy();
  });
});

describe("CustomerPrivacyCenterScreen (web parity source signals)", () => {
  it("draws its design from the shared webPrivacyCenterPage module + AccountPageShell", () => {
    expect(privacyCenterSource).toContain("webPrivacyCenterPage");
    expect(privacyCenterSource).toContain("AccountPageShell");
  });
});
