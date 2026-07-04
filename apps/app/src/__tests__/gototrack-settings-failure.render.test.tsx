import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGoGoTrackSettings } from "@mobile/gototrack/useGoGoTrackSettings";

describe("useGoGoTrackSettings failure handling", () => {
  it("reverts an optimistic toggle when persistence rejects", async () => {
    const onPersistError = vi.fn();
    const api = {
      getSettings: vi.fn(async () => ({
        notification_listener_enabled: false,
        screenshot_recovery_enabled: false,
        usage_stats_enabled: false,
      })),
      updateSettings: vi.fn(async () => {
        throw new Error("offline");
      }),
    };

    const { result } = renderHook(() => useGoGoTrackSettings(api, { onPersistError }));

    await waitFor(() => expect(api.getSettings).toHaveBeenCalled());

    await act(async () => {
      result.current.setField("usageStatsEnabled", true);
    });

    await waitFor(() => expect(result.current.settings.usageStatsEnabled).toBe(false));
    expect(api.updateSettings).toHaveBeenCalledWith({ usageStatsEnabled: true });
    expect(onPersistError).toHaveBeenCalledWith("usageStatsEnabled");
  });
});
