import type { ConfigContext, ExpoConfig } from "expo/config";

const appIdentity = {
  displayName: "GoGoCash",
  scheme: "gogocash",
  iosBundleIdentifier: "co.gogocash.app",
  androidPackage: "co.gogocash.app",
} as const;

type ConfigRequire = { resolve: (specifier: string) => string };

const workspaceRoot = process.env.GITHUB_WORKSPACE || process.cwd().replace(/\/apps\/app$/, "");
var require: ConfigRequire =
  (globalThis as typeof globalThis & { require?: ConfigRequire }).require ??
  { resolve: (specifier: string) => `${workspaceRoot}/node_modules/${specifier}` };

const envDefaults = {
  accountDataSource: "fixtures",
  apiUrl: "https://api-staging.gogocash.co",
  appEnv: "staging",
  frontendUrl: "https://app-staging.gogocash.co",
} as const;

// Resolve font assets via Node module resolution rather than a hardcoded
// "./node_modules/..." relative path. In the npm-workspaces monorepo the
// @expo-google-fonts/* packages hoist to the ROOT node_modules, so the old
// app-relative paths pointed at files that do not exist and the expo-font
// config plugin would embed zero fonts at native build time.
const fontPath = (specifier: string): string => require.resolve(specifier);

const dmSansFonts = {
  regular: fontPath("@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf"),
  medium: fontPath("@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf"),
  semiBold: fontPath("@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf"),
  bold: fontPath("@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf"),
  extraBold: fontPath("@expo-google-fonts/dm-sans/800ExtraBold/DMSans_800ExtraBold.ttf"),
  black: fontPath("@expo-google-fonts/dm-sans/900Black/DMSans_900Black.ttf"),
} as const;

const anuphanFonts = {
  regular: fontPath("@expo-google-fonts/anuphan/400Regular/Anuphan_400Regular.ttf"),
  medium: fontPath("@expo-google-fonts/anuphan/500Medium/Anuphan_500Medium.ttf"),
  semiBold: fontPath("@expo-google-fonts/anuphan/600SemiBold/Anuphan_600SemiBold.ttf"),
  bold: fontPath("@expo-google-fonts/anuphan/700Bold/Anuphan_700Bold.ttf"),
} as const;

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

const mobileExpoConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appIdentity.displayName,
  slug: "gogocash-mobile",
  scheme: appIdentity.scheme,
  version: "0.1.0",
  // OTA: native builds with the same app version receive eas update bundles.
  // Bump `version` when native code or config plugins change.
  runtimeVersion: {
    policy: "appVersion",
  },
  ...(easProjectId
    ? {
        updates: {
          url: `https://u.expo.dev/${easProjectId}`,
        },
      }
    : {}),
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: appIdentity.iosBundleIdentifier,
    supportsTablet: false,
    associatedDomains: ["applinks:app.gogocash.co", "applinks:app-staging.gogocash.co"],
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#ffffff",
      foregroundImage: "./assets/adaptive-icon.png",
    },
    package: appIdentity.androidPackage,
  },
  web: {
    bundler: "metro",
    favicon: "./assets/nav/logo.png",
    lang: "en",
    name: appIdentity.displayName,
    shortName: appIdentity.displayName,
  },
  plugins: [
    // Native OTA: wires updates.url + runtimeVersion into Android/iOS manifests at prebuild.
    // Also applied automatically by EAS prebuild (versionedExpoSDKPackages); explicit entry
    // keeps OTA intent visible and ensures config survives custom prebuild flows.
    "expo-updates",
    "expo-router",
    "@react-native-community/datetimepicker",
    [
      "expo-font",
      {
        ios: {
          fonts: [...Object.values(dmSansFonts), ...Object.values(anuphanFonts)],
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
    // GoGoSense: declares PACKAGE_USAGE_STATS for the Android UsageStats detector.
    "./plugins/withGogosenseUsageAccess",
  ],
  extra: {
    accountDataSource: process.env.EXPO_PUBLIC_ACCOUNT_DATA_SOURCE ?? envDefaults.accountDataSource,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? envDefaults.apiUrl,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? envDefaults.appEnv,
    frontendUrl: process.env.EXPO_PUBLIC_FRONTEND_URL ?? envDefaults.frontendUrl,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "",
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "",
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
});

export default mobileExpoConfig;
