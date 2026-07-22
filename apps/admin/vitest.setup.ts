// The /vitest entrypoint both calls expect.extend AND augments vitest's
// Assertion interface, so jest-dom matchers type-check under tsc --noEmit
// (the previous manual `expect.extend(matchers)` only registered them at
// runtime, leaving 85 TS2339s across the test suites).
import "@testing-library/jest-dom/vitest";

// Node 26 ships an experimental built-in `localStorage`/`sessionStorage` that is
// inert without `--localstorage-file` and shadows happy-dom's Web Storage. Tests
// that touch `localStorage`/`window.localStorage` then blow up with
// `Cannot read properties of undefined (reading 'clear')`. Install one
// deterministic in-memory Storage per test file and share it between `globalThis`
// and `window` so `localStorage === window.localStorage`. Harmless on Node 24.
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  const storage = new MemoryStorage() as unknown as Storage;
  const define = (target: object) => {
    try {
      Object.defineProperty(target, name, {
        value: storage,
        configurable: true,
        writable: true,
      });
    } catch {
      // Host forbids redefinition — leave the existing implementation in place.
    }
  };
  define(globalThis);
  const win = (globalThis as { window?: object }).window;
  if (win && win !== (globalThis as unknown as object)) {
    define(win);
  }
}
