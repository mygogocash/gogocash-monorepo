import { createElement } from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// DeepLinkReplay mounts inside AppProviders' ready branch (same commit as the
// router Stack): it marks the navigator ready and replays any deep link that
// was buffered while the bootstrap gate kept the Stack unmounted.

const routerNavigate = vi.fn();

vi.mock("expo-router", () => ({
  useRouter: () => ({ navigate: routerNavigate, push: vi.fn(), replace: vi.fn() }),
}));

const listeners: Array<(event: { url: string }) => void> = [];
vi.mock("expo-linking", () => ({
  addEventListener: (_type: string, handler: (event: { url: string }) => void) => {
    listeners.push(handler);
    return { remove: vi.fn() };
  },
}));

import { DeepLinkReplay } from "@mobile/navigation/DeepLinkReplay";
import {
  resetPendingDeepLinkForTests,
  subscribeEarlyDeepLinkCapture,
} from "@mobile/navigation/pendingDeepLink";

function emit(url: string) {
  for (const listener of listeners) listener({ url });
}

describe("DeepLinkReplay", () => {
  beforeEach(() => {
    routerNavigate.mockClear();
    listeners.length = 0;
    resetPendingDeepLinkForTests();
    subscribeEarlyDeepLinkCapture();
  });

  it("replays a link buffered during the bootstrap gate once mounted", () => {
    emit("gogocash://wallet");

    render(createElement(DeepLinkReplay));

    expect(routerNavigate).toHaveBeenCalledWith("/wallet");
  });

  it("renders nothing and navigates nowhere when no link is pending", () => {
    const { container } = render(createElement(DeepLinkReplay));

    expect(routerNavigate).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe("");
  });

  it("stops buffering after mount — live links belong to expo-router", () => {
    render(createElement(DeepLinkReplay));
    emit("gogocash://quest");

    // A second replay component render must not navigate from the live link.
    routerNavigate.mockClear();
    render(createElement(DeepLinkReplay));
    expect(routerNavigate).not.toHaveBeenCalled();
  });
});
