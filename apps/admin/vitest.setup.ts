// The /vitest entrypoint both calls expect.extend AND augments vitest's
// Assertion interface, so jest-dom matchers type-check under tsc --noEmit
// (the previous manual `expect.extend(matchers)` only registered them at
// runtime, leaving 85 TS2339s across the test suites).
import "@testing-library/jest-dom/vitest";

// Web Storage polyfill for the test realm. happy-dom DOES implement
// localStorage/sessionStorage, but vitest never copies them onto the test
// global: Node 22+ exposes an inert experimental `localStorage` global
// (`'localStorage' in globalThis` is true, value undefined, gated behind
// `--localstorage-file`), so vitest's global-copy filter treats the key as
// "already present" and skips happy-dom's real Storage. jsdom hits the same
// filter, so swapping test environments would not help — the fix belongs here.
// Without it, every suite touching storage dies with "Cannot read properties of
// undefined (reading 'clear')". Contract pinned by webStorage.env.test.ts.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  const storage = {
    get length(): number {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(String(key));
    },
    setItem(key: string, value: string): void {
      store.set(String(key), String(value));
    },
  };
  return storage as unknown as Storage;
}

// True only when `name` is ALREADY a real, working Storage installed as a data
// property. Node's inert global is an ACCESSOR (a getter that warns and yields
// undefined); we read the descriptor rather than the value, so we detect it
// without invoking the getter — neither emitting the ExperimentalWarning nor
// clobbering a genuine Storage that a future vitest/happy-dom might populate.
function hasWorkingStorage(target: object, name: string): boolean {
  const desc = Object.getOwnPropertyDescriptor(target, name);
  if (!desc || !("value" in desc)) return false;
  const value = desc.value as { clear?: unknown } | undefined;
  return typeof value?.clear === "function";
}

// Install a distinct instance per storage type on globalThis (and on `window`
// when it is a separate object) so both `localStorage.*` and
// `window.localStorage.*` access paths share one backing store. Only fills a
// genuine gap — a real Storage already on the target is left untouched.
function installWebStorage(name: "localStorage" | "sessionStorage"): void {
  const storage = createMemoryStorage();
  const targets: Array<Record<string, unknown>> = [
    globalThis as unknown as Record<string, unknown>,
  ];
  const win = (globalThis as { window?: unknown }).window;
  if (win && win !== globalThis) {
    targets.push(win as Record<string, unknown>);
  }
  for (const target of targets) {
    if (hasWorkingStorage(target, name)) continue;
    try {
      Object.defineProperty(target, name, {
        value: storage,
        configurable: true,
        writable: true,
      });
    } catch {
      target[name] = storage;
    }
  }
}

installWebStorage("localStorage");
installWebStorage("sessionStorage");
