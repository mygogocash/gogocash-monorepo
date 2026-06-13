// Test stub for @sentry/react-native used ONLY by the render-test config. The real
// package statically imports the Flow-typed `react-native` package, which the render
// harness aliases to react-native-web for app code — but @sentry/react-native is an
// externalized dependency, so Node (not Vite) resolves its internal `react-native`
// import, bypassing the alias and loading the real RN. That reaches
// react-native/Libraries/Promise.js, whose extensionless `import 'promise/setimmediate/
// es6-extensions'` the externalized-ESM resolver cannot resolve ("Cannot find module
// .../promise/setimmediate/es6-extensions"). Stubbing the package at the seam keeps the
// real @mobile/observability/client source under test while severing the un-aliased RN
// path — the same approach used for posthog-react-native, react-native-svg, et al.
//
// Only @mobile/observability/client imports this package, and only Sentry.init() and
// Sentry.setUser() are called at runtime (the Sentry.ErrorEvent reference is type-only
// and is stripped before execution; `tsc` still resolves the real package's types).
// Both are no-ops here: render mounts never start Sentry or reset identity. Never
// bundled into the app.

export function init(_options?: unknown): void {}

export function setUser(_user: unknown): void {}

export default { init, setUser };
