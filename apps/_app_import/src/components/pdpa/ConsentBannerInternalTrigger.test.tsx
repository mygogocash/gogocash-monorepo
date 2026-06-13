// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_BANNER_DISMISSED_EVENT,
  CONSENT_BANNER_OPEN_EVENT,
  PDPA_CONSENT_BANNER_DISMISSED_KEY,
} from "@/lib/pdpa/consentBannerChannel";
import ConsentBannerInternalTrigger from "./ConsentBannerInternalTrigger";

function createMemoryStorage(): Storage {
  const memory = new Map<string, string>();
  return {
    get length() {
      return memory.size;
    },
    clear() {
      memory.clear();
    },
    getItem(key: string) {
      return memory.get(key) ?? null;
    },
    key(index: number) {
      return [...memory.keys()][index] ?? null;
    },
    removeItem(key: string) {
      memory.delete(key);
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
  } as Storage;
}

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_INTERNAL_CONSENT_BANNER_BUTTON: "1",
  },
}));

describe("ConsentBannerInternalTrigger", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    vi.stubGlobal("localStorage", storage);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("consent trigger > given banner was dismissed > then it stays hidden until the open event resets it", () => {
    localStorage.setItem(PDPA_CONSENT_BANNER_DISMISSED_KEY, "1");

    render(<ConsentBannerInternalTrigger />);

    expect(screen.queryByRole("button", { name: "cookieBannerInternalTriggerAria" })).toBeNull();

    localStorage.removeItem(PDPA_CONSENT_BANNER_DISMISSED_KEY);
    fireEvent(window, new CustomEvent(CONSENT_BANNER_OPEN_EVENT));

    expect(
      screen.getByRole("button", { name: "cookieBannerInternalTriggerAria" })
    ).toBeInTheDocument();
  });

  it("consent trigger > given banner is visible > then dismissed event hides the trigger", () => {
    render(<ConsentBannerInternalTrigger />);

    expect(
      screen.getByRole("button", { name: "cookieBannerInternalTriggerAria" })
    ).toBeInTheDocument();

    localStorage.setItem(PDPA_CONSENT_BANNER_DISMISSED_KEY, "1");
    fireEvent(window, new CustomEvent(CONSENT_BANNER_DISMISSED_EVENT));

    expect(screen.queryByRole("button", { name: "cookieBannerInternalTriggerAria" })).toBeNull();
  });
});
