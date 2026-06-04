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

  it("auth_boundary_states__given_stack_protected_and_callback_flows__then_expo_gates_natively", () => {
    const rootLayout = readMobileFile("app/_layout.tsx");
    const callbackFile = readMobileFile("src/screens/CustomerAuthCallbackScreen.tsx");

    // Native route protection replaces the old Stack-unmounting guard: protected
    // screens are wrapped in Stack.Protected (guard={isAuthed}); login is gated by
    // !isAuthed and declared first so an unauthenticated tap falls back to /login.
    expect(rootLayout).toContain("Stack.Protected");
    expect(rootLayout).toContain("guard={isAuthed}");
    expect(rootLayout).toContain("guard={!isAuthed}");
    expect(rootLayout).toContain("useAuthGuardSession");
    expect(rootLayout).toContain('name="login"');

    // The auth callback flow still reuses the shared route-state component.
    expect(callbackFile).toContain("CustomerRouteState");
    expect(callbackFile).toContain("getRouteStateVariant");
    expect(callbackFile).not.toContain("<ActivityIndicator");
    expect(callbackFile).not.toContain("styles.card");
  });
});
