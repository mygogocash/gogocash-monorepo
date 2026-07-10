import { createElement, type PropsWithChildren, type ReactElement } from "react";
import { afterEach, vi } from "vitest";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function ensureLocalStorage() {
  const existingStorage =
    typeof globalThis.localStorage === "undefined"
      ? createMemoryStorage()
      : globalThis.localStorage;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: existingStorage,
    writable: true,
  });

  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: existingStorage,
      writable: true,
    });
  }
}

// React Native code guards dev-only branches behind the __DEV__ global (Metro defines
// it at build time). vitest doesn't, so any RN module that reads __DEV__ at load throws
// "ReferenceError: __DEV__ is not defined" (e.g. the legal/markdown chain pulled in by
// the privacy-policy screen). Define it for the render harness, matching Metro's dev default.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
ensureLocalStorage();

// Overridable device locale: tests that exercise device-region detection set
// `globalThis.__mockDeviceLocale.regionCode` (see region-hydration.render.test).
// A per-file vi.mock cannot override this setup-level factory, so the mock
// reads mutable state instead.
type MockDeviceLocale = { languageTag: string; languageCode: string; regionCode?: string };
const mockDeviceLocale: MockDeviceLocale = { languageTag: "en-US", languageCode: "en" };
(globalThis as { __mockDeviceLocale?: MockDeviceLocale }).__mockDeviceLocale = mockDeviceLocale;
vi.mock("expo-localization", () => ({
  getLocales: () => [
    (globalThis as { __mockDeviceLocale?: MockDeviceLocale }).__mockDeviceLocale,
  ],
}));

const renderFetch = vi.fn(async () => new Response(null, { status: 204 }));
vi.stubGlobal("fetch", renderFetch);

vi.mock("@testing-library/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@testing-library/react")>();
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { ThemeProvider } = await import("@mobile/theme/ThemeProvider");
  const { LocaleProvider } = await import("@mobile/i18n/LocaleProvider");
  const { FavoriteBrandsProvider } = await import("@mobile/account/FavoriteBrandsProvider");

  function wrapWithTheme(
    ui: ReactElement,
    options?: Parameters<typeof actual.render>[1]
  ): ReturnType<typeof actual.render> {
    const UserWrapper = options?.wrapper;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: PropsWithChildren) => {
      const favorites = createElement(FavoriteBrandsProvider, {}, children);
      const localized = createElement(LocaleProvider, {}, favorites);
      const themed = createElement(ThemeProvider, {}, localized);
      const queried = createElement(QueryClientProvider, { client: queryClient }, themed);
      return UserWrapper ? createElement(UserWrapper, {}, queried) : queried;
    };
    return actual.render(ui, { ...options, wrapper: Wrapper });
  }

  return {
    ...actual,
    render: wrapWithTheme,
  };
});

import { cleanup } from "@testing-library/react";

import { resetOfflineGoGoTrackSettingsForTests } from "@mobile/gototrack/useGoGoTrackSettings";

// Unmount React trees between render tests so happy-dom state never leaks.
afterEach(() => {
  renderFetch.mockClear();
  resetOfflineGoGoTrackSettingsForTests();
  cleanup();
});
