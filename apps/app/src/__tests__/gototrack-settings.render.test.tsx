import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGoGoTrackSettings } from "@mobile/gototrack/useGoGoTrackSettings";

describe("useGoGoTrackSettings (render)", () => {
  it("loads settings then optimistically toggles + persists via updateSettings", async () => {
    const api = {
      getSettings: vi.fn(async () => ({
        enabled: true,
        usage_stats_enabled: true,
        notification_listener_enabled: false,
        screenshot_recovery_enabled: true,
      })),
      updateSettings: vi.fn(async () => ({})),
    };

    const { result } = renderHook(() => useGoGoTrackSettings(api));

    await waitFor(() => expect(result.current.settings.usageStatsEnabled).toBe(true));

    act(() => {
      result.current.setField("usageStatsEnabled", false);
    });

    expect(result.current.settings.usageStatsEnabled).toBe(false);
    expect(api.updateSettings).toHaveBeenCalledWith({ usageStatsEnabled: false });
  });

  it("setField > given background prompts enabled > then also sends enabled true", async () => {
    const api = {
      getSettings: vi.fn(async () => ({
        enabled: false,
        usage_stats_enabled: false,
        notification_listener_enabled: false,
        screenshot_recovery_enabled: true,
        background_prompts_enabled: false,
      })),
      updateSettings: vi.fn(async () => ({})),
    };

    const { result } = renderHook(() => useGoGoTrackSettings(api));

    await waitFor(() =>
      expect(result.current.settings.backgroundPromptsEnabled).toBe(false),
    );

    act(() => {
      result.current.setField("backgroundPromptsEnabled", true);
    });

    expect(api.updateSettings).toHaveBeenCalledWith({
      backgroundPromptsEnabled: true,
      enabled: true,
    });
  });

  it("uses safe defaults off-device (no api)", () => {
    const { result } = renderHook(() => useGoGoTrackSettings(null));

    expect(result.current.settings.usageStatsEnabled).toBe(false);
    expect(result.current.settings.screenshotRecoveryEnabled).toBe(true);
  });
});
