import { describe, expect, it, vi, beforeEach } from "vitest";

const { getMobileEnv, getSharedSessionStore } = vi.hoisted(() => ({
  getMobileEnv: vi.fn(() => ({ apiUrl: "https://api.example.test" })),
  getSharedSessionStore: vi.fn(async () => ({
    getSession: vi.fn(async () => ({ access_token: "jwt-abc" })),
  })),
}));

vi.mock("@mobile/config/env", () => ({ getMobileEnv }));
vi.mock("@mobile/auth/sharedSessionStore", () => ({ getSharedSessionStore }));

import {
  resolveBackgroundPromptMonitorConfig,
  syncBackgroundPromptMonitorConfig,
} from "@mobile/gototrack/syncBackgroundPromptMonitorConfig";
import type { GoGoTrackDetector } from "@mobile/gototrack/detector";

describe("syncBackgroundPromptMonitorConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolveBackgroundPromptMonitorConfig > includes auth token from session", async () => {
    await expect(resolveBackgroundPromptMonitorConfig(true)).resolves.toEqual({
      enabled: true,
      authToken: "jwt-abc",
      apiBaseUrl: "https://api.example.test",
    });
  });

  it("syncBackgroundPromptMonitorConfig > calls detector sync with resolved config", async () => {
    const syncBackgroundPromptConfig = vi.fn(async () => undefined);
    const detector = { syncBackgroundPromptConfig } as unknown as GoGoTrackDetector;

    await syncBackgroundPromptMonitorConfig(detector, true);

    expect(syncBackgroundPromptConfig).toHaveBeenCalledWith({
      enabled: true,
      authToken: "jwt-abc",
      apiBaseUrl: "https://api.example.test",
    });
  });
});
