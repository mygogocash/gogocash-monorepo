// Config plugin: declare GoGoTrack UsageStats + background monitor permissions —
// or, when DISABLED, force-strip everything GoGoTrack-related from the merged
// manifest.
//
// Why strip instead of just not adding (field bug 2026-07-11): the local expo
// module modules/gototrack-detector carries its OWN library manifest with
// FOREGROUND_SERVICE / FOREGROUND_SERVICE_SPECIAL_USE / POST_NOTIFICATIONS and
// the specialUse GototrackMonitorService. Library manifests merge at Gradle
// time regardless of this plugin, so a store build "without" the plugin still
// shipped those entries (verified in the compiled manifest of EAS build vc42)
// and tripped Play's Foreground Service declaration. tools:node="remove" in
// the app manifest outranks library manifests during the merge.

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

const MONITOR_SERVICE = "co.gogocash.gototrack.GototrackMonitorService";
const PROMPT_RECEIVER = "co.gogocash.gototrack.GototrackPromptReceiver";
const ALL_GOTOTRACK_PERMISSIONS = [
  USAGE_STATS_PERMISSION,
  FOREGROUND_SERVICE,
  FOREGROUND_SERVICE_SPECIAL_USE,
  POST_NOTIFICATIONS,
];

function ensureRemoveEntry(collection, name) {
  const alreadyDeclared = collection.some(
    (entry) => entry?.$?.["android:name"] === name,
  );
  if (!alreadyDeclared) {
    collection.push({ $: { "android:name": name, "tools:node": "remove" } });
  }
}

function applyGototrackStripManifest(manifest) {
  if (!manifest.$) {
    manifest.$ = {};
  }
  if (!manifest.$["xmlns:tools"]) {
    manifest.$["xmlns:tools"] = TOOLS_NS;
  }

  manifest["uses-permission"] = manifest["uses-permission"] ?? [];
  for (const permission of ALL_GOTOTRACK_PERMISSIONS) {
    ensureRemoveEntry(manifest["uses-permission"], permission);
  }

  manifest.application = manifest.application ?? [{}];
  const application = manifest.application[0];
  application.service = application.service ?? [];
  ensureRemoveEntry(application.service, MONITOR_SERVICE);
  application.receiver = application.receiver ?? [];
  ensureRemoveEntry(application.receiver, PROMPT_RECEIVER);

  return manifest;
}

function withGototrackUsageAccess(config, { enabled = true } = {}) {
  return withAndroidManifest(config, (cfg) => {
    if (enabled) {
      applyGototrackUsageAccessManifest(cfg.modResults.manifest);
    } else {
      applyGototrackStripManifest(cfg.modResults.manifest);
    }
    return cfg;
  });
}

module.exports = withGototrackUsageAccess;
module.exports.applyGototrackUsageAccessManifest = applyGototrackUsageAccessManifest;
module.exports.applyGototrackStripManifest = applyGototrackStripManifest;
module.exports.GOGOSENSE_USAGE_STATS_PERMISSION = USAGE_STATS_PERMISSION;
