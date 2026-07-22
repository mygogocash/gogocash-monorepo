// The /vitest entrypoint both calls expect.extend AND augments vitest's
// Assertion interface, so jest-dom matchers type-check under tsc --noEmit
// (the previous manual `expect.extend(matchers)` only registered them at
// runtime, leaving 85 TS2339s across the test suites).
import "@testing-library/jest-dom/vitest";

// ── Web Storage polyfill for happy-dom tests on Node 22+ ─────────────────────
// Node 22+ exposes a lazy global `localStorage`/`sessionStorage` getter that
// returns `undefined` (and warns) unless the process is started with
// `--localstorage-file`. vitest's happy-dom environment aliases `window` onto
// `globalThis`, so `window.localStorage` resolves to Node's unavailable Storage
// rather than a working one — breaking every `@vitest-environment happy-dom`
// test that touches localStorage. Provide a real in-memory Storage only when the
// environment doesn't already have a working one (never clobbers a real DOM
// Storage). Runs per test file, so state does not leak between files.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  const storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  };
  return storage as unknown as Storage;
}

function ensureWorkingStorage(
  target: object,
  name: "localStorage" | "sessionStorage",
) {
  let working = false;
  try {
    const current = (target as Record<string, { getItem?: unknown } | undefined>)[
      name
    ];
    working = typeof current?.getItem === "function";
  } catch {
    // Node's global getter can throw when accessed without --localstorage-file.
    working = false;
  }
  if (!working) {
    Object.defineProperty(target, name, {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  ensureWorkingStorage(globalThis, name);
  if (typeof window !== "undefined" && window !== (globalThis as unknown)) {
    ensureWorkingStorage(window, name);
  }
}
