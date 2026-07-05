import { vi } from "vitest";

// Metro defines __DEV__ at build time; node vitest does not. Expo modules read it at load.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;

// customerAccountResource.ts imports useLocale -> LocaleProvider -> expo-localization ->
// expo-modules-core, which expects native Expo globals absent in the node harness.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));
