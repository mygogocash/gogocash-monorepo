import { describe, expect, it, vi } from "vitest";

import { haptics } from "@mobile/lib/haptics";

// haptics wraps expo-haptics with a web/native guard + try/catch (never throws).
// haptics.ts deliberately has NO static `react-native` import (it reads Platform.OS
// through an injectable seam / dynamic import, mirroring localeStorage.ts), so this
// lives in the fast node SOURCE suite rather than the render suite.
//
// The internal seam: each method accepts an optional options bag
//   { platformOS, loadModule } — production defaults read Platform.OS from a lazy
// react-native import and load expo-haptics lazily. Tests inject both so the node
// environment never touches the Flow-typed react-native module or the native binary.

type HapticsModule = {
  notificationAsync: (type: unknown) => Promise<void>;
  impactAsync: (style?: unknown) => Promise<void>;
  NotificationFeedbackType: { Success: unknown; Error: unknown };
  ImpactFeedbackStyle: { Medium: unknown };
};

function makeModule(overrides: Partial<HapticsModule> = {}): HapticsModule {
  return {
    notificationAsync: vi.fn(async () => {}),
    impactAsync: vi.fn(async () => {}),
    NotificationFeedbackType: { Success: "success", Error: "error" },
    ImpactFeedbackStyle: { Medium: "medium" },
    ...overrides,
  };
}

describe("haptics web/native guard", () => {
  it("success/impact/error are no-ops on web (native module never loaded)", async () => {
    const loadModule = vi.fn(async () => makeModule());

    await haptics.success({ platformOS: "web", loadModule });
    await haptics.impact({ platformOS: "web", loadModule });
    await haptics.error({ platformOS: "web", loadModule });

    expect(loadModule).not.toHaveBeenCalled();
  });

  it("does not throw on web", async () => {
    const loadModule = vi.fn(async () => makeModule());
    await expect(
      haptics.success({ platformOS: "web", loadModule })
    ).resolves.toBeUndefined();
  });

  it("calls the matching expo-haptics fn on native", async () => {
    const mod = makeModule();
    const loadModule = vi.fn(async () => mod);

    await haptics.success({ platformOS: "ios", loadModule });
    await haptics.impact({ platformOS: "ios", loadModule });
    await haptics.error({ platformOS: "android", loadModule });

    expect(mod.notificationAsync).toHaveBeenCalledWith(mod.NotificationFeedbackType.Success);
    expect(mod.notificationAsync).toHaveBeenCalledWith(mod.NotificationFeedbackType.Error);
    expect(mod.impactAsync).toHaveBeenCalledWith(mod.ImpactFeedbackStyle.Medium);
  });

  it("swallows errors when the native module rejects (does not throw)", async () => {
    const loadModule = vi.fn(async () =>
      makeModule({
        notificationAsync: vi.fn(async () => {
          throw new Error("native haptics unavailable");
        }),
        impactAsync: vi.fn(async () => {
          throw new Error("native haptics unavailable");
        }),
      })
    );

    await expect(haptics.success({ platformOS: "ios", loadModule })).resolves.toBeUndefined();
    await expect(haptics.impact({ platformOS: "ios", loadModule })).resolves.toBeUndefined();
    await expect(haptics.error({ platformOS: "ios", loadModule })).resolves.toBeUndefined();
  });

  it("swallows errors when the native module is absent (loader rejects)", async () => {
    const loadModule = vi.fn(async () => {
      throw new Error("Cannot find module 'expo-haptics'");
    });

    await expect(haptics.success({ platformOS: "ios", loadModule })).resolves.toBeUndefined();
  });
});
