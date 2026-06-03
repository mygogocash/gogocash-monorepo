import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Native code guards dev-only branches behind the __DEV__ global (Metro defines
// it at build time). vitest doesn't, so any RN module that reads __DEV__ at load throws
// "ReferenceError: __DEV__ is not defined" (e.g. the legal/markdown chain pulled in by
// the privacy-policy screen). Define it for the render harness, matching Metro's dev default.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;

// Unmount React trees between render tests so happy-dom state never leaks.
afterEach(() => {
  cleanup();
});
