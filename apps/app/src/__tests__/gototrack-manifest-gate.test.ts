import { describe, expect, it } from "vitest";

// Plain CJS config plugin — imported directly so the manifest mutations are
// unit-testable without a prebuild.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../../plugins/withGototrackUsageAccess.js");

type ManifestEntry = { $: Record<string, string> };
type Manifest = {
  $?: Record<string, string>;
  "uses-permission"?: ManifestEntry[];
  application?: Array<{
    $?: Record<string, string>;
    service?: ManifestEntry[];
    receiver?: ManifestEntry[];
  }>;
};

const FGS = "android.permission.FOREGROUND_SERVICE";
const FGS_SPECIAL = "android.permission.FOREGROUND_SERVICE_SPECIAL_USE";
const USAGE = "android.permission.PACKAGE_USAGE_STATS";
const NOTIF = "android.permission.POST_NOTIFICATIONS";
const MONITOR_SERVICE = "co.gogocash.gototrack.GototrackMonitorService";
const PROMPT_RECEIVER = "co.gogocash.gototrack.GototrackPromptReceiver";

function permissions(manifest: Manifest) {
  return (manifest["uses-permission"] ?? []).map((entry) => ({
    name: entry.$["android:name"],
    node: entry.$["tools:node"],
  }));
}

// Field bug 2026-07-11 (Play Console closed-testing release): gating the
// config plugin off removed PACKAGE_USAGE_STATS but the store AAB (vc42)
// STILL carried FOREGROUND_SERVICE + FOREGROUND_SERVICE_SPECIAL_USE — the
// local expo module modules/gototrack-detector declares them in its own
// library manifest, which merges at GRADLE time. Verified by extracting the
// compiled manifest from the actual EAS artifact. Disabled builds must now
// actively STRIP those entries with tools:node="remove", which outranks
// library manifests in the merge.
describe("gototrack manifest gate", () => {
  it("strip mode > given the module library manifest merges later > then every gototrack permission is force-removed", () => {
    const manifest: Manifest = { application: [{}] };

    plugin.applyGototrackStripManifest(manifest);

    const perms = permissions(manifest);
    for (const name of [FGS, FGS_SPECIAL, USAGE, NOTIF]) {
      expect(perms).toContainEqual({ name, node: "remove" });
    }
    expect(manifest.$?.["xmlns:tools"]).toBe("http://schemas.android.com/tools");
  });

  it("strip mode > given the specialUse service and receiver in the module manifest > then both components are force-removed", () => {
    const manifest: Manifest = { application: [{}] };

    plugin.applyGototrackStripManifest(manifest);

    const services = (manifest.application?.[0]?.service ?? []).map((s) => s.$);
    const receivers = (manifest.application?.[0]?.receiver ?? []).map((r) => r.$);
    expect(services).toContainEqual(
      expect.objectContaining({ "android:name": MONITOR_SERVICE, "tools:node": "remove" }),
    );
    expect(receivers).toContainEqual(
      expect.objectContaining({ "android:name": PROMPT_RECEIVER, "tools:node": "remove" }),
    );
  });

  it("strip mode > given a double application > then entries are not duplicated", () => {
    const manifest: Manifest = { application: [{}] };

    plugin.applyGototrackStripManifest(manifest);
    plugin.applyGototrackStripManifest(manifest);

    const removeEntries = permissions(manifest).filter((p) => p.name === FGS_SPECIAL);
    expect(removeEntries).toHaveLength(1);
    expect(manifest.application?.[0]?.service ?? []).toHaveLength(1);
  });

  it("enabled mode > given gototrack ships > then the additive behavior is unchanged", () => {
    const manifest: Manifest = {};

    plugin.applyGototrackUsageAccessManifest(manifest);

    const perms = permissions(manifest);
    expect(perms).toContainEqual({ name: USAGE, node: undefined });
    expect(perms).toContainEqual({ name: FGS, node: undefined });
  });

  it("plugin entry > given the app config > then the plugin is ALWAYS applied with an enabled flag", () => {
    // The conditional-spread form silently skipped the strip in disabled
    // builds — the plugin must always run so disabled builds get the removes.
    const fs = require("node:fs");
    const path = require("node:path");
    const appConfig = fs.readFileSync(
      path.resolve(__dirname, "../../app.config.js"),
      "utf8",
    );
    expect(appConfig).toMatch(
      /\["\.\/plugins\/withGototrackUsageAccess", \{ enabled: enableGototrack \}\]/,
    );
    expect(appConfig).not.toMatch(/enableGototrack \? \["\.\/plugins\/withGototrackUsageAccess"\] : \[\]/);
  });
});
