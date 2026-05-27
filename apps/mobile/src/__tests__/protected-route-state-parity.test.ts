import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Protected route state parity", () => {
  it("route_state_component__given_nextjs_state_contracts__then_expo_has_shared_variants", () => {
    const stateFile = readMobileFile("src/components/CustomerRouteState.tsx");

    for (const variant of ["loading", "empty", "error", "offline", "unauthenticated"]) {
      expect(stateFile, `missing route state variant: ${variant}`).toContain(variant);
    }

    expect(stateFile).toContain("CustomerRouteState");
    expect(stateFile).toContain("ActivityIndicator");
    expect(stateFile).toContain("accessibilityRole={isAlertVariant ? \"alert\" : undefined}");
    expect(stateFile).toContain("MotionPressable");
    expect(stateFile).toContain("fontFamily: typography.family");
    expect(stateFile).toContain("fontWeight: typography.titleWeight");
    expect(stateFile).toContain("lineHeight: typography.titleLineHeight");
    expect(stateFile).toContain("fontWeight: typography.bodyWeight");
    expect(stateFile).toContain("lineHeight: typography.bodyLineHeight");
  });

  it("startup_loading__given_runtime_fonts_are_pending__then_expo_renders_loading_not_blank", () => {
    const providersFile = readMobileFile("src/providers/AppProviders.tsx");

    expect(providersFile).toContain("CustomerRouteState");
    expect(providersFile).toContain('variant="loading"');
    expect(providersFile).toContain("Loading GoGoCash");
    expect(providersFile).not.toContain("return null;");
  });

  it("auth_boundary_states__given_guard_and_callback_flows__then_expo_reuses_route_state", () => {
    const guardFile = readMobileFile("src/auth/AuthRouteGuard.tsx");
    const callbackFile = readMobileFile("src/screens/CustomerAuthCallbackScreen.tsx");

    expect(guardFile).toContain("CustomerRouteState");
    expect(guardFile).toContain('variant="loading"');
    expect(guardFile).toContain('variant="unauthenticated"');
    expect(guardFile).toContain('variant="offline"');
    expect(guardFile).toContain("isWebRuntimeOffline");
    expect(guardFile).not.toContain("ProtectedRouteStateScreen");

    expect(callbackFile).toContain("CustomerRouteState");
    expect(callbackFile).toContain("getRouteStateVariant");
    expect(callbackFile).not.toContain("<ActivityIndicator");
    expect(callbackFile).not.toContain("styles.card");
  });
});
