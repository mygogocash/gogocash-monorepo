// Dependency hygiene contract (issue #61).
//
// npm `overrides` are silently ignored in this workspaces repo (verified on
// npm 10.9.8, 11.17.0, and 12.0.1), so the security floors below are enforced
// by direct package-lock.json pins. Any `npm install` reconcile can silently
// revert those pins — this contract turns that revert into a CI failure.
//
// Floors map to the repo's Dependabot alerts:
//   #24 postcss  < 8.5.10            (GHSA-qx2v-qp2m-jg93)
//   #25 ws       >= 8.0.0, < 8.20.1  (GHSA-58qx-3vcg-4xpx)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath =
  process.env.DEPENDENCY_HYGIENE_LOCKFILE ??
  resolve(repoRoot, "package-lock.json");
const lock = JSON.parse(readFileSync(lockPath, "utf8"));

function parseVersion(raw) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(raw ?? "");
  assert.ok(match, `unparseable version ${JSON.stringify(raw)}`);
  return match.slice(1, 4).map(Number);
}

function compareVersions(a, b) {
  const [aa, bb] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < 3; i += 1) {
    if (aa[i] !== bb[i]) return aa[i] - bb[i];
  }
  return 0;
}

function lockEntriesFor(packageName) {
  const suffix = `node_modules/${packageName}`;
  return Object.entries(lock.packages ?? {})
    .filter(([path]) => path === suffix || path.endsWith(`/${suffix}`))
    .map(([path, meta]) => ({ path, version: meta.version }));
}

test("lockfile > postcss > every copy is >= 8.5.10 (Dependabot #24)", () => {
  const stale = lockEntriesFor("postcss").filter(
    ({ version }) => compareVersions(version, "8.5.10") < 0,
  );
  assert.deepEqual(
    stale,
    [],
    "postcss below the GHSA-qx2v-qp2m-jg93 floor — restore the package-lock.json pin (npm overrides are ignored in this workspaces repo; see issue #61)",
  );
});

test("lockfile > ws > no copy in the vulnerable 8.0.0–8.20.0 range (Dependabot #25)", () => {
  const vulnerable = lockEntriesFor("ws").filter(
    ({ version }) =>
      compareVersions(version, "8.0.0") >= 0 &&
      compareVersions(version, "8.20.1") < 0,
  );
  assert.deepEqual(
    vulnerable,
    [],
    "ws inside the GHSA-58qx-3vcg-4xpx range — restore the package-lock.json resolution (see issue #61)",
  );
});
