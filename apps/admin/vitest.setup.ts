// The /vitest entrypoint both calls expect.extend AND augments vitest's
// Assertion interface, so jest-dom matchers type-check under tsc --noEmit
// (the previous manual `expect.extend(matchers)` only registered them at
// runtime, leaving 85 TS2339s across the test suites).
import "@testing-library/jest-dom/vitest";

// localStorage shim. happy-dom 20 (npm-major bump) no longer populates
// window.localStorage, and Node 24's native localStorage is gated behind
// --localstorage-file (it emits an ExperimentalWarning and resolves undefined).
// Provide a minimal in-memory Storage so localStorage-backed tests work under
// the happy-dom environment. One shared instance is bound to both `window` and
// the global scope so `window.localStorage` and bare `localStorage` see the same
// store. Fresh per test file (setup runs per file); harmless in node-env tests
// that never touch it.
class MemoryStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryLocalStorage = new MemoryStorage() as unknown as Storage;

function installLocalStorage(target: object | undefined): void {
  if (!target) return;
  try {
    Object.defineProperty(target, "localStorage", {
      value: memoryLocalStorage,
      configurable: true,
      writable: true,
    });
  } catch {
    // Best effort: a non-configurable native binding can't be overridden, but
    // the happy-dom window binding (the one the tests read) always can.
  }
}

installLocalStorage((globalThis as { window?: object }).window);
installLocalStorage(globalThis);
