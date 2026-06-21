import { afterEach, describe, expect, it, vi } from "vitest";

describe("appLinks", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    vi.resetModules();
  });

  it("defaults local customer-app links to Expo web on port 19006", async () => {
    const { appLinks } = await import("./appLinks");

    expect(appLinks.home()).toBe("http://localhost:19006");
    expect(appLinks.offer("offer-1")).toBe(
      "http://localhost:19006/shop/offer-1",
    );
    expect(appLinks.path("/quest")).toBe("http://localhost:19006/quest");
  });

  it("uses NEXT_PUBLIC_APP_URL when provided", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.gogocash.co/";
    const { appLinks } = await import("./appLinks");

    expect(appLinks.home()).toBe("https://app.gogocash.co");
    expect(appLinks.offer("offer-1")).toBe(
      "https://app.gogocash.co/shop/offer-1",
    );
    expect(appLinks.path("quest")).toBe("https://app.gogocash.co/quest");
  });
});
