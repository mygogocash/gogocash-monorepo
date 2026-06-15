// Config plugin: declare the PACKAGE_USAGE_STATS permission GoGoSense needs to
// read the foreground app via UsageStatsManager. It is a signature|appop
// permission (granted by the user in the special "Usage access" settings
// screen, opened from the app), so Android lint flags it as a ProtectedPermission
// — we add `tools:ignore="ProtectedPermissions"` so the manifest merge passes.
//
// Scope (locked MVP): UsageStats only. No NotificationListener / screenshot /
// QUERY_ALL_PACKAGES. A `<queries>` merchant allowlist is intentionally omitted —
// reading the foreground package NAME via queryEvents does not require package
// visibility; add it only if/when we resolve merchant labels or launch intents.
const { withAndroidManifest } = require("@expo/config-plugins");

const PERMISSION = "android.permission.PACKAGE_USAGE_STATS";
const TOOLS_NS = "http://schemas.android.com/tools";

/** @param {import('@expo/config-plugins').ExpoConfig} config */
module.exports = function withGogosenseUsageAccess(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    manifest.$ = manifest.$ || {};
    if (!manifest.$["xmlns:tools"]) {
      manifest.$["xmlns:tools"] = TOOLS_NS;
    }

    manifest["uses-permission"] = manifest["uses-permission"] || [];
    const alreadyDeclared = manifest["uses-permission"].some(
      (entry) => entry?.$?.["android:name"] === PERMISSION,
    );
    if (!alreadyDeclared) {
      manifest["uses-permission"].push({
        $: {
          "android:name": PERMISSION,
          "tools:ignore": "ProtectedPermissions",
        },
      });
    }

    return cfg;
  });
};
