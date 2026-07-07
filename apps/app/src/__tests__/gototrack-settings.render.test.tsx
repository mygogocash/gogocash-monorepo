import { createElement, type PropsWithChildren } from "react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGoGoTrackSettings } from "@mobile/gototrack/useGoGoTrackSettings";

function createSettingsTestWrapper(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

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

    const { result } = renderHook(() => useGoGoTrackSettings(api), {
      wrapper: createSettingsTestWrapper(),
    });

    await waitFor(() => expect(result.current.settings.usageStatsEnabled).toBe(true));

    act(() => {
      result.current.setField("usageStatsEnabled", false);
    });

    await waitFor(() => expect(result.current.settings.usageStatsEnabled).toBe(false));
    expect(api.updateSettings).toHaveBeenCalledWith({ usageStatsEnabled: false });
  });

  it("setField > given a second mounted instance > then both read the same shared cache", async () => {
    const api = {
      getSettings: vi.fn(async () => ({
        enabled: true,
        usage_stats_enabled: true,
        notification_listener_enabled: false,
        screenshot_recovery_enabled: true,
      })),
      updateSettings: vi.fn(async () => ({})),
    };
    const wrapper = createSettingsTestWrapper();

    const { result: writer } = renderHook(() => useGoGoTrackSettings(api), { wrapper });
    await waitFor(() => expect(writer.current.settings.usageStatsEnabled).toBe(true));

    act(() => {
      writer.current.setField("usageStatsEnabled", false);
    });

    const { result: reader } = renderHook(() => useGoGoTrackSettings(api), { wrapper });
    await waitFor(() => expect(reader.current.settings.usageStatsEnabled).toBe(false));
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

    const { result } = renderHook(() => useGoGoTrackSettings(api), {
      wrapper: createSettingsTestWrapper(),
    });

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
    const { result } = renderHook(() => useGoGoTrackSettings(null), {
      wrapper: createSettingsTestWrapper(),
    });

    expect(result.current.settings.usageStatsEnabled).toBe(false);
    expect(result.current.settings.screenshotRecoveryEnabled).toBe(true);
  });

  it("setField > background prompts toggled on > syncs native monitor immediately", async () => {
    const api = {
      getSettings: vi.fn(async () => ({ background_prompts_enabled: false })),
      updateSettings: vi.fn(async () => ({})),
    };
    const syncMonitor = vi.fn();

    const { result } = renderHook(
      () => useGoGoTrackSettings(api, { syncMonitor }),
      { wrapper: createSettingsTestWrapper() },
    );

    await waitFor(() =>
      expect(result.current.settings.backgroundPromptsEnabled).toBe(false),
    );

    act(() => {
      result.current.setField("backgroundPromptsEnabled", true);
    });

    expect(syncMonitor).toHaveBeenCalledWith(true);
  });

  it("setField > background prompts persist fails > re-syncs monitor with rolled-back value", async () => {
    const api = {
      getSettings: vi.fn(async () => ({ background_prompts_enabled: false })),
      updateSettings: vi.fn(async () => {
        throw new Error("persist failed");
      }),
    };
    const syncMonitor = vi.fn();

    const { result } = renderHook(
      () => useGoGoTrackSettings(api, { syncMonitor }),
      { wrapper: createSettingsTestWrapper() },
    );

    await waitFor(() =>
      expect(result.current.settings.backgroundPromptsEnabled).toBe(false),
    );

    act(() => {
      result.current.setField("backgroundPromptsEnabled", true);
    });

    await waitFor(() =>
      expect(result.current.settings.backgroundPromptsEnabled).toBe(false),
    );
    expect(syncMonitor).toHaveBeenNthCalledWith(1, true);
    expect(syncMonitor).toHaveBeenNthCalledWith(2, false);
  });

  it("setField > usage stats toggle > does not touch the monitor sync", async () => {
    const api = {
      getSettings: vi.fn(async () => ({ usage_stats_enabled: false })),
      updateSettings: vi.fn(async () => ({})),
    };
    const syncMonitor = vi.fn();

    const { result } = renderHook(
      () => useGoGoTrackSettings(api, { syncMonitor }),
      { wrapper: createSettingsTestWrapper() },
    );

    await waitFor(() =>
      expect(result.current.settings.usageStatsEnabled).toBe(false),
    );

    act(() => {
      result.current.setField("usageStatsEnabled", true);
    });

    expect(syncMonitor).not.toHaveBeenCalled();
  });
});

describe("useGoGoTrackBackgroundPrompts (render)", () => {
  it("waits for settings readiness before syncing the monitor (source signal)", () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../gototrack/useGoGoTrackBackgroundPrompts.ts"),
      "utf8",
    );

    expect(source).toContain("isSettingsReady");
    expect(source).toContain("if (!isSettingsReady)");
  });
});
