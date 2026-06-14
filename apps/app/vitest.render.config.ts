import path from "node:path";
import { defineConfig } from "vitest/config";

// Render-test harness (audit item #2): proves routed screens/components mount
// without throwing — coverage the source-string *.test.ts suite cannot give.
// React Native is Flow-typed and cannot be parsed by vitest, so we alias it to
// react-native-web (compiled JS) and render to a happy-dom DOM via
// @testing-library/react. Kept in a SEPARATE config + *.render.test.tsx glob so
// the source-string suite (vitest.config.ts) stays untouched.
//
// Array alias form (not object) so we can use a regex for phosphor: the icon
// adapter imports ~90 deep default paths (phosphor-react-native/lib/module/
// icons/<Name>) that ship unresolvable ESM, so every phosphor path maps to one
// stub. Order matters — first match wins; the more specific package aliases come
// before the broad "@mobile" source alias.
const stub = (file: string) => path.resolve(__dirname, "./src/test-support", file);

export default defineConfig({
  root: __dirname,
  test: {
    environment: "happy-dom",
    include: ["src/**/*.render.test.tsx"],
    setupFiles: ["./vitest.render.setup.ts"],
  },
  resolve: {
    alias: [
      // static assets (png/jpg/svg/...) cannot be parsed as modules by rolldown;
      // map every asset extension to an opaque stub. MUST be first so it wins
      // before the broad source aliases.
      { find: /^.*\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/, replacement: stub("assetStub.ts") },
      // phosphor-react-native (root or any deep path) -> single icon stub
      { find: /^phosphor-react-native(\/.*)?$/, replacement: stub("phosphorReactNativeStub.tsx") },
      // react-native-svg ships ESM the rolldown/oxc transform rejects -> passthrough stub.
      { find: /^react-native-svg(\/.*)?$/, replacement: stub("reactNativeSvgStub.tsx") },
      // posthog-react-native ships a value-position `typeof` type alias the
      // rolldown/oxc transform rejects ("Unexpected token 'typeof'"); stub it.
      // usePostHog()->undefined exercises the production "no key" branch.
      { find: "posthog-react-native", replacement: stub("posthogReactNativeStub.tsx") },
      // @sentry/react-native statically imports the real Flow-typed react-native.
      // As an externalized dep it is resolved by Node, NOT Vite, so the
      // react-native -> react-native-web alias below never applies to it; the real
      // RN then loads react-native/Libraries/Promise.js whose extensionless
      // `import 'promise/setimmediate/es6-extensions'` the externalized resolver
      // rejects. Stub the package so @mobile/observability/client (init/setUser
      // no-op here) stays real while the un-aliased RN path is severed.
      { find: "@sentry/react-native", replacement: stub("sentryReactNativeStub.ts") },
      // expo-router's native router resolves to a non-component object under
      // happy-dom and breaks rendering; swap it for a passthrough test stub.
      { find: "expo-router", replacement: stub("expoRouterStub.tsx") },
      // CustomerDesktopFooterSlot -> CustomerDesktopFooter, whose line-16 type
      // alias uses a value-position `typeof` the rolldown/oxc transform rejects
      // ("Unexpected token 'typeof'", though tsc accepts it). The desktop footer
      // is presentational chrome irrelevant to render smoke tests, so stub it.
      // Exact path (must precede the broad "@mobile" alias).
      {
        find: "@mobile/components/CustomerDesktopFooterSlot",
        replacement: stub("desktopFooterSlotStub.tsx"),
      },
      // useCopy() calls useIntl(), which needs the IntlProvider that LocaleProvider mounts in the app
      // tree; screen render tests don't mount providers, so stub it to a passthrough. (translateCopy
      // is unit-tested in the source suite.) Must precede the broad "@mobile" alias.
      {
        find: "@mobile/i18n/useCopy",
        replacement: stub("useCopyStub.ts"),
      },
      // react-native-safe-area-context ships a value-position `typeof` type alias
      // the transform rejects; imported by AccountPageShell (-> the 14 shell
      // screens) + others. Stub passes children through, hooks return zero insets.
      // Must precede "react-native" (prefix) and the broad "@mobile" alias.
      {
        find: "react-native-safe-area-context",
        replacement: stub("safeAreaContextStub.tsx"),
      },
      // react-native is Flow-typed; render against react-native-web instead.
      { find: "react-native", replacement: path.resolve(__dirname, "./node_modules/react-native-web") },
      { find: "@mobile", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
