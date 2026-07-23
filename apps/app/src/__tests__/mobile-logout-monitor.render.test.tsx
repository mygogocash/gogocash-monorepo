import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const clearMobileAppSession = vi.hoisted(() => vi.fn(async () => {}));
const syncBackgroundPromptMonitorConfig = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ clear: vi.fn() }),
}));
vi.mock("@mobile/auth/session", () => ({
  clearMobileAppSession,
}));
vi.mock("@mobile/lib/haptics", () => ({
  haptics: { success: vi.fn(async () => {}) },
}));
vi.mock("@mobile/observability/client", () => ({
  resetObservabilityIdentity: vi.fn(),
}));
vi.mock("@mobile/gototrack/detectorInstance", () => ({
  gototrackDetector: { kind: "test-detector" },
}));
vi.mock("@mobile/gototrack/syncBackgroundPromptMonitorConfig", () => ({
  syncBackgroundPromptMonitorConfig,
}));

import { useMobileLogout } from "@mobile/auth/useMobileLogout";

describe("useMobileLogout (render)", () => {
  it("logout > disables the native GoGoTrack monitor after the session is cleared", async () => {
    const { result } = renderHook(() => useMobileLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(clearMobileAppSession).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(syncBackgroundPromptMonitorConfig).toHaveBeenCalledWith(
        { kind: "test-detector" },
        false,
      ),
    );
  });
});
