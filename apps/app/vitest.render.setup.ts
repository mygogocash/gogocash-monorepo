import { createElement, type PropsWithChildren, type ReactElement } from "react";
import { afterEach, vi } from "vitest";

// React Native code guards dev-only branches behind the __DEV__ global (Metro defines
// it at build time). vitest doesn't, so any RN module that reads __DEV__ at load throws
// "ReferenceError: __DEV__ is not defined" (e.g. the legal/markdown chain pulled in by
// the privacy-policy screen). Define it for the render harness, matching Metro's dev default.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;

vi.mock("@testing-library/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@testing-library/react")>();
  const { ThemeProvider } = await import("@mobile/theme/ThemeProvider");

  function wrapWithTheme(
    ui: ReactElement,
    options?: Parameters<typeof actual.render>[1]
  ): ReturnType<typeof actual.render> {
    const UserWrapper = options?.wrapper;
    const Wrapper = ({ children }: PropsWithChildren) => {
      const themed = createElement(ThemeProvider, {}, children);
      return UserWrapper ? createElement(UserWrapper, {}, themed) : themed;
    };
    return actual.render(ui, { ...options, wrapper: Wrapper });
  }

  return {
    ...actual,
    render: wrapWithTheme,
  };
});

import { cleanup } from "@testing-library/react";

// Unmount React trees between render tests so happy-dom state never leaks.
afterEach(() => {
  cleanup();
});
