import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGoGoTrackSettings } from "@mobile/gototrack/useGoGoTrackSettings";

function createSettingsTestWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

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

    const { result } = renderHook(() => useGoGoTrackSettings(api, { onPersistError }), {
      wrapper: createSettingsTestWrapper(),
    });

    await waitFor(() => expect(api.getSettings).toHaveBeenCalled());

    await act(async () => {
      result.current.setField("usageStatsEnabled", true);
    });

    await waitFor(() => expect(result.current.settings.usageStatsEnabled).toBe(false));
    expect(api.updateSettings).toHaveBeenCalledWith({
      usageStatsEnabled: true,
      enabled: true,
    });
    expect(onPersistError).toHaveBeenCalledWith("usageStatsEnabled");
  });
});
