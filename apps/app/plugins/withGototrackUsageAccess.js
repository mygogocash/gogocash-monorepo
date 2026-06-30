// Config plugin: declare GoGoTrack UsageStats + background monitor permissions.
//
// Scope: UsageStats foreground detection and optional FGS monitor with actionable
// notifications for background cashback prompts (user opt-in).

const { withAndroidManifest } = require("@expo/config-plugins");

const USAGE_STATS_PERMISSION = "android.permission.PACKAGE_USAGE_STATS";
const FOREGROUND_SERVICE = "android.permission.FOREGROUND_SERVICE";
const FOREGROUND_SERVICE_SPECIAL_USE =
  "android.permission.FOREGROUND_SERVICE_SPECIAL_USE";
const POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
const TOOLS_NS = "http://schemas.android.com/tools";

function ensurePermission(manifest, name, extra = {}) {
  manifest["uses-permission"] = manifest["uses-permission"] ?? [];
  const alreadyDeclared = manifest["uses-permission"].some(
    (entry) => entry?.$?.["android:name"] === name,
  );
  if (!alreadyDeclared) {
    manifest["uses-permission"].push({
      $: {
        "android:name": name,
        ...extra,
      },
    });
  }
}

function applyGototrackUsageAccessManifest(manifest) {
  if (!manifest.$) {
    manifest.$ = {};
  }
  if (!manifest.$["xmlns:tools"]) {
    manifest.$["xmlns:tools"] = TOOLS_NS;
  }

  ensurePermission(manifest, USAGE_STATS_PERMISSION, {
    "tools:ignore": "ProtectedPermissions",
  });
  ensurePermission(manifest, FOREGROUND_SERVICE);
  ensurePermission(manifest, FOREGROUND_SERVICE_SPECIAL_USE);
  ensurePermission(manifest, POST_NOTIFICATIONS);

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
module.exports.GOGOSENSE_USAGE_STATS_PERMISSION = USAGE_STATS_PERMISSION;
