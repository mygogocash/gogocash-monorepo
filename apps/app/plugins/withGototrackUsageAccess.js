// Config plugin: declare the PACKAGE_USAGE_STATS permission GoGoTrack needs to
// read Android foreground-app usage via UsageStatsManager.
//
// Scope guard: the MVP is foreground UsageStats only. Do not add
// NotificationListenerService, screenshot capture, foreground service, or
// QUERY_ALL_PACKAGES. A `<queries>` merchant allowlist is intentionally omitted
// because UsageStatsManager reports package names without package visibility.

const { withAndroidManifest } = require("@expo/config-plugins");

const PERMISSION = "android.permission.PACKAGE_USAGE_STATS";
const TOOLS_NS = "http://schemas.android.com/tools";

function applyGototrackUsageAccessManifest(manifest) {
  if (!manifest.$) {
    manifest.$ = {};
  }
  if (!manifest.$["xmlns:tools"]) {
    manifest.$["xmlns:tools"] = TOOLS_NS;
  }

  manifest["uses-permission"] = manifest["uses-permission"] ?? [];
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

  return manifest;
}

function withGototrackUsageAccess(config) {
  return withAndroidManifest(config, (cfg) => {
    applyGototrackUsageAccessManifest(cfg.modResults.manifest);
    return cfg;
  });
}

module.exports = withGototrackUsageAccess;
module.exports.applyGototrackUsageAccessManifest = applyGototrackUsageAccessManifest;
module.exports.GOGOSENSE_USAGE_STATS_PERMISSION = PERMISSION;
