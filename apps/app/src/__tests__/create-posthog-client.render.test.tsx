import { afterEach, describe, expect, it, vi } from "vitest";

// Crash-resilience contract for analytics client construction. On web,
// posthog-react-native's constructor throws synchronously when no storage
// module is installed ("PostHog: No storage available...") — which unmounted
// the entire React root on beta.gogocash.co (blank screen, 2026-07-19).
// Analytics init failure must degrade to the no-op client, never crash boot.

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock("posthog-react-native");
});

describe("createPostHogClient", () => {
  it("given the real library on a web-like environment > then never throws (worst case: no-op fallback)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { createPostHogClient } = await import(
      "@mobile/analytics/createPostHogClient"
    );

    let client: unknown;
    expect(() => {
      client = createPostHogClient({
        posthogKey: "phc_test_key",
        posthogHost: "https://us.i.posthog.com",
      });
    }).not.toThrow();

    const c = client as { capture: unknown; identify: unknown; reset: unknown };
    expect(typeof c.capture).toBe("function");
    expect(typeof c.identify).toBe("function");
    expect(typeof c.reset).toBe("function");
  });

  it("given the PostHog constructor throws > then falls back to the no-op client and warns", async () => {
    vi.doMock("posthog-react-native", () => ({
      PostHog: class {
        constructor() {
          throw new Error(
            "PostHog: No storage available. Please install expo-file-system or react-native-async-storage OR implement a custom storage provider.",
          );
        }
      },
      PostHogProvider: ({ children }: { children?: unknown }) => children,
    }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.resetModules();
    const { createPostHogClient, noOpPostHogClient } = await import(
      "@mobile/analytics/createPostHogClient"
    );

    const client = createPostHogClient({ posthogKey: "phc_test_key" });

    expect(client).toBe(noOpPostHogClient);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("PostHog"),
      expect.anything(),
    );
  });

  it("given no key configured > then returns the shared no-op client", async () => {
    const { createPostHogClient, noOpPostHogClient } = await import(
      "@mobile/analytics/createPostHogClient"
    );

    expect(createPostHogClient(null)).toBe(noOpPostHogClient);
    expect(createPostHogClient({ posthogKey: "" })).toBe(noOpPostHogClient);
  });

  it("no-op client methods are safe to call", async () => {
    const { noOpPostHogClient } = await import(
      "@mobile/analytics/createPostHogClient"
    );
    const c = noOpPostHogClient as unknown as {
      capture: (e: string) => void;
      identify: (id: string) => void;
      reset: () => void;
    };
    expect(() => {
      c.capture("evt");
      c.identify("user");
      c.reset();
    }).not.toThrow();
  });
});
