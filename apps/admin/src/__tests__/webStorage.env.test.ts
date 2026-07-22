// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Environment contract for Web Storage under the happy-dom test environment.
 *
 * happy-dom implements localStorage/sessionStorage, but vitest never copies
 * them onto the test global: Node 22+ exposes an inert experimental
 * `localStorage` global (present as a key, value undefined), so vitest's
 * global-copy filter skips happy-dom's real Storage. vitest.setup.ts fills the
 * gap with an in-memory polyfill. This suite is the sentinel for that contract:
 * if the setup polyfill is ever removed while the environment still lacks
 * storage, these tests fail loudly and name the cause — instead of the
 * *Storage.test.ts suites dying with a cryptic "Cannot read properties of
 * undefined (reading 'clear')".
 */
describe("Web Storage env contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("exposes localStorage as a working Storage on both globalThis and window", () => {
    expect(typeof localStorage.setItem).toBe("function");
    expect(typeof window.localStorage.setItem).toBe("function");
    // Same backing store via either access path.
    localStorage.setItem("k", "v");
    expect(window.localStorage.getItem("k")).toBe("v");
  });

  it("round-trips set/get/remove/clear/length/key for localStorage", () => {
    expect(localStorage.length).toBe(0);
    localStorage.setItem("a", "1");
    localStorage.setItem("b", "2");
    expect(localStorage.length).toBe(2);
    expect(localStorage.getItem("a")).toBe("1");
    expect(localStorage.key(0)).toBe("a");
    expect(localStorage.getItem("missing")).toBeNull();
    localStorage.removeItem("a");
    expect(localStorage.getItem("a")).toBeNull();
    expect(localStorage.length).toBe(1);
    localStorage.clear();
    expect(localStorage.length).toBe(0);
  });

  it("coerces non-string values to strings on set", () => {
    localStorage.setItem("n", 42 as unknown as string);
    expect(localStorage.getItem("n")).toBe("42");
  });

  it("exposes a working, independent sessionStorage", () => {
    expect(typeof sessionStorage.setItem).toBe("function");
    sessionStorage.setItem("s", "1");
    expect(sessionStorage.getItem("s")).toBe("1");
    // Independent from localStorage.
    expect(localStorage.getItem("s")).toBeNull();
  });
});
