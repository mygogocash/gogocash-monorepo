// Plain-JS dynamic Expo config (was app.config.ts). TypeScript 7 ships no JS
// compiler API, and @expo/require-utils prefers `require("typescript")` for
// .ts configs — under TS7 that resolves a version stub and crashes on
// `ts.ModuleKind`. A .js config skips the TS transpile path entirely.
// (Expo's native stripTypeScriptTypes fallback only engages when the
// typescript package is absent, which it never is here.) TypeScript therefore
// remains an intentional `expo.install.exclude`: it is a build-tool exception,
// while every native/runtime dependency stays aligned to Expo SDK 57.

/** @typedef {import("expo/config").ConfigContext} ConfigContext */
/** @typedef {import("expo/config").ExpoConfig} ExpoConfig */

const appIdentity = {
  displayName: "GoGoCash",
  scheme: "gogocash",
  iosBundleIdentifier: "co.gogocash.app",
  androidPackage: "co.gogocash.app",
};

const workspaceRoot =
  process.env.GITHUB_WORKSPACE || process.cwd().replace(/\/apps\/app$/, "");

// Native Firebase (phone OTP via @react-native-firebase/auth) needs the
// platform config files at prebuild. They come from an EAS file secret
// (GOOGLE_SERVICES_JSON / GOOGLE_SERVICE_INFO_PLIST) or a local file next to
// this config; when neither exists the plugin + field are omitted so prebuild
// keeps working — that binary then reports native phone sign-in unavailable.
const nodeFs = typeof require === "function" ? require("node:fs") : null;
const localConfigFile = (name) =>
  typeof __dirname === "string" && nodeFs?.existsSync(`${__dirname}/${name}`)
    ? `./${name}`
    : null;
const googleServicesAndroid =
  process.env.GOOGLE_SERVICES_JSON ?? localConfigFile("google-services.json");
const googleServicesIos =
  process.env.GOOGLE_SERVICE_INFO_PLIST ??
  localConfigFile("GoogleService-Info.plist");
const nativeFirebaseEnabled = Boolean(
  googleServicesAndroid || googleServicesIos,
);

// Preserves the original app.config.ts semantics: use a global require if the
// eval context provides one, else fall back to root-hoisted node_modules paths.
/** @type {{ resolve: (specifier: string) => string }} */
const requireShim = globalThis.require ?? {
  resolve: (specifier) => `${workspaceRoot}/node_modules/${specifier}`,
};

const envDefaults = {
  accountDataSource: "fixtures",
  apiUrl: "https://api-staging.gogocash.co",
  appEnv: "staging",
  frontendUrl: "https://app-staging.gogocash.co",
};

// Resolve font assets via Node module resolution rather than a hardcoded
// "./node_modules/..." relative path. In the npm-workspaces monorepo the
// @expo-google-fonts/* packages hoist to the ROOT node_modules, so the old
// app-relative paths pointed at files that do not exist and the expo-font
// config plugin would embed zero fonts at native build time.
/** @param {string} specifier @returns {string} */
const fontPath = (specifier) => requireShim.resolve(specifier);

const dmSansFonts = {
  regular: fontPath(
    "@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf",
  ),
  medium: fontPath("@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf"),
  semiBold: fontPath(
    "@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf",
  ),
  bold: fontPath("@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf"),
  extraBold: fontPath(
    "@expo-google-fonts/dm-sans/800ExtraBold/DMSans_800ExtraBold.ttf",
  ),
  black: fontPath("@expo-google-fonts/dm-sans/900Black/DMSans_900Black.ttf"),
};

const anuphanFonts = {
  regular: fontPath(
    "@expo-google-fonts/anuphan/400Regular/Anuphan_400Regular.ttf",
  ),
  medium: fontPath(
    "@expo-google-fonts/anuphan/500Medium/Anuphan_500Medium.ttf",
  ),
  semiBold: fontPath(
    "@expo-google-fonts/anuphan/600SemiBold/Anuphan_600SemiBold.ttf",
  ),
  bold: fontPath("@expo-google-fonts/anuphan/700Bold/Anuphan_700Bold.ttf"),
};

// Canonical EAS project (@gogocash/gogocash-mobile). Pinned so eas-cli commands
// that don't inject build-profile env — notably `eas submit` — still resolve the
// org project instead of trying to create a personal one. Same id committed in
// eas.json's per-profile EXPO_PUBLIC_EAS_PROJECT_ID.
const EAS_PROJECT_ID = "0039c25f-f88e-491d-8da9-85b8d6e66558";
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

/** Google iOS OAuth client id → reversed URL scheme for the Sign-In config plugin. */
const toGoogleIosUrlScheme = (iosClientId) => {
  const trimmed = iosClientId.trim();
  const suffix = ".apps.googleusercontent.com";
  if (trimmed.startsWith("com.googleusercontent.apps.")) {
    return trimmed;
  }
  if (trimmed.endsWith(suffix)) {
    return `com.googleusercontent.apps.${trimmed.slice(0, -suffix.length)}`;
  }
  return `com.googleusercontent.apps.${trimmed}`;
};

const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
const googleIosClientId =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? "";
const googleIosUrlScheme = googleIosClientId
  ? toGoogleIosUrlScheme(googleIosClientId)
  : undefined;

/** @type {string | [string, { iosUrlScheme: string }]} */
const googleSignInPlugin = googleIosUrlScheme
  ? [
      "@react-native-google-signin/google-signin",
      { iosUrlScheme: googleIosUrlScheme },
    ]
  : "@react-native-google-signin/google-signin";

/** @param {ConfigContext} context @returns {ExpoConfig} */
const enableGototrack =
  (process.env.EXPO_PUBLIC_ENABLE_GOTOTRACK ??
    ((process.env.EXPO_PUBLIC_APP_ENV ?? envDefaults.appEnv) === "production"
      ? "0"
      : "1")) === "1";

const mobileExpoConfig = ({ config }) => ({
  ...config,
  name: appIdentity.displayName,
  slug: "gogocash-mobile",
  scheme: appIdentity.scheme,
  // 0.3.0: adds Google Sign-In native module (dormant until EXPO_PUBLIC_GOOGLE_*_CLIENT_ID).
  // 0.2.0: adds the @react-native-firebase native module (phone OTP) — a new
  // runtime; 0.1.0 binaries must not receive this JS.
  version: "0.3.0",
  // OTA: native builds with the same app version receive eas update bundles.
  // Bump `version` when native code or config plugins change.
  runtimeVersion: {
    policy: "appVersion",
  },
  ...(easProjectId
    ? {
        updates: {
          url: `https://u.expo.dev/${easProjectId}`,
          checkAutomatically: "ON_LOAD",
          fallbackToCacheTimeout: 0,
        },
      }
    : {}),
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: appIdentity.iosBundleIdentifier,
    supportsTablet: false,
    ...(googleServicesIos ? { googleServicesFile: googleServicesIos } : {}),
    associatedDomains: [
      "applinks:app.gogocash.co",
      "applinks:app-staging.gogocash.co",
    ],
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#00CC99",
      backgroundImage: "./assets/adaptive-icon-bg.png",
      foregroundImage: "./assets/adaptive-icon.png",
    },
    // Android App Links: opens https://app.gogocash.co links in the app.
    // autoVerify requires /.well-known/assetlinks.json on each host carrying
    // the Play App Signing SHA-256 (see docs/PLAYSTORE_LAUNCH.md §App Links).
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        category: ["BROWSABLE", "DEFAULT"],
        data: [
          { scheme: "https", host: "app.gogocash.co" },
          { scheme: "https", host: "app-staging.gogocash.co" },
        ],
      },
    ],
    package: appIdentity.androidPackage,
    ...(googleServicesAndroid
      ? { googleServicesFile: googleServicesAndroid }
      : {}),
  },
  web: {
    bundler: "metro",
    favicon: "./assets/nav/logo.png",
    lang: "en",
    name: appIdentity.displayName,
    shortName: appIdentity.displayName,
  },
  plugins: [
    // firebase-ios-sdk pods (pulled by autolinking from package.json even when
    // the RNFB plugin below is omitted) cannot integrate as static LIBRARIES —
    // their ObjC deps define no modules — so every iOS build needs static
    // FRAMEWORKS. Unconditional on purpose.
    [
      "expo-build-properties",
      {
        // Pin Play's target-API compliance explicitly (Play requires 35+;
        // SDK 57's template already targets 36 — this makes it auditable).
        android: { compileSdkVersion: 36, targetSdkVersion: 36 },
        ios: { useFrameworks: "static" },
      },
    ],
    // Native Firebase default-app init (phone OTP) — only when a google
    // services file is available (see nativeFirebaseEnabled above).
    ...(nativeFirebaseEnabled ? ["@react-native-firebase/app"] : []),
    // Native OTA: wires updates.url + runtimeVersion into Android/iOS manifests at prebuild.
    // Also applied automatically by EAS prebuild (versionedExpoSDKPackages); explicit entry
    // keeps OTA intent visible and ensures config survives custom prebuild flows.
    "expo-updates",
    "expo-router",
    "@sentry/react-native",
    "@react-native-community/datetimepicker",
    "expo-image",
    "expo-localization",
    "expo-secure-store",
    [
      "expo-font",
      {
        ios: {
          fonts: [
            ...Object.values(dmSansFonts),
            ...Object.values(anuphanFonts),
          ],
        },
        android: {
          fonts: [
            {
              fontFamily: "DM Sans",
              fontDefinitions: [
                { path: dmSansFonts.regular, weight: 400 },
                { path: dmSansFonts.medium, weight: 500 },
                { path: dmSansFonts.semiBold, weight: 600 },
                { path: dmSansFonts.bold, weight: 700 },
                { path: dmSansFonts.extraBold, weight: 800 },
                { path: dmSansFonts.black, weight: 900 },
              ],
            },
            {
              fontFamily: "Anuphan",
              fontDefinitions: [
                { path: anuphanFonts.regular, weight: 400 },
                { path: anuphanFonts.medium, weight: 500 },
                { path: anuphanFonts.semiBold, weight: 600 },
                { path: anuphanFonts.bold, weight: 700 },
              ],
            },
          ],
        },
      },
    ],
    "expo-status-bar",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        image: "./assets/splash.png",
        resizeMode: "contain",
      },
    ],
    // GoGoTrack declares PACKAGE_USAGE_STATS — a Play RESTRICTED permission
    // (declaration form + high rejection risk). Store builds ship WITHOUT it;
    // EXPO_PUBLIC_ENABLE_GOTOTRACK=1 (default for non-production envs) keeps
    // it in dev/staging builds. ALWAYS applied: when disabled the plugin
    // force-strips the permissions + specialUse service that the local
    // gototrack-detector module's library manifest would otherwise merge in
    // at Gradle time (Play FGS-declaration trigger, found on the vc42 AAB).
    ["./plugins/withGototrackUsageAccess", { enabled: enableGototrack }],
    // Native Google Sign-In (dormant until EXPO_PUBLIC_GOOGLE_*_CLIENT_ID are set).
    // Always registered so the native module ships; iosUrlScheme only when iOS client id is set.
    googleSignInPlugin,
  ],
  extra: {
    accountDataSource:
      process.env.EXPO_PUBLIC_ACCOUNT_DATA_SOURCE ??
      envDefaults.accountDataSource,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? envDefaults.apiUrl,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? envDefaults.appEnv,
    frontendUrl:
      process.env.EXPO_PUBLIC_FRONTEND_URL ?? envDefaults.frontendUrl,
    googleWebClientId,
    googleIosClientId,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "",
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "",
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
    eas: {
      projectId:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || EAS_PROJECT_ID,
    },
  },
});

module.exports = mobileExpoConfig;
