import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

type MobilePackageJson = {
  dependencies: Record<string, string>;
};

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json") as MobilePackageJson;

const latestExpoRuntimeDependencies = [
  "@expo/metro-runtime",
  "expo",
  "expo-font",
  "expo-linking",
  "expo-router",
  "expo-secure-store",
  "expo-splash-screen",
  "expo-status-bar",
  "react",
  "react-dom",
  "react-native",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-web",
] as const;

describe("mobile Expo SDK target", () => {
  it("expo sdk target > given latest stable Expo release > then mobile package targets SDK 57", () => {
    expect(packageJson.dependencies.expo).toMatch(/^\^?~?57\./);
    expect(packageJson.dependencies.react).toMatch(/^19\.2\./);
    expect(packageJson.dependencies["react-dom"]).toMatch(/^19\.2\./);
    expect(packageJson.dependencies["react-native"]).toMatch(/^0\.86\./);

    const unpinnedRuntimeDependencies = latestExpoRuntimeDependencies.filter(
      (dependencyName) => packageJson.dependencies[dependencyName] === "latest"
    );

    expect(unpinnedRuntimeDependencies).toEqual([]);
  });
});
