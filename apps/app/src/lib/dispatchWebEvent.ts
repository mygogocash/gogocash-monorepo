// Web-parity event dispatch. On native Hermes, `window` exists (RN polyfill) but
// `CustomEvent` / `window.dispatchEvent` do not — so feature-detect the ACTUAL APIs,
// not `window`. A bare `typeof window !== "undefined"` guard passes on native and
// still throws on `new CustomEvent(...)`. No-op everywhere those APIs are absent.
export function dispatchWebEvent(eventName: string): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(new CustomEvent(eventName));
}
