/**
 * firebase-tools 15.x still calls js-yaml safeLoad/safeDump in the App
 * Distribution YAML helper. js-yaml 4 removes those aliases, so keep the CLI
 * compatible with the root security override to js-yaml 4.2.0.
 *
 * Idempotent: safe to run multiple times.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.join(__dirname, "..");
const repoRoot = path.resolve(adminRoot, "..", "..");

const candidateRoots = [
  path.join(adminRoot, "node_modules", "firebase-tools"),
  path.join(repoRoot, "node_modules", "firebase-tools"),
];

const roots = Array.from(new Set(candidateRoots));

function patchFirebaseTools(root) {
  const helperPath = path.join(root, "lib", "appdistribution", "yaml_helper.js");
  if (!fs.existsSync(helperPath)) {
    return false;
  }

  let source = fs.readFileSync(helperPath, "utf8");
  const alreadyPatched = source.includes("jsYaml.dump({ tests:") && source.includes("jsYaml.load(yaml)");
  if (alreadyPatched) {
    return true;
  }

  const next = source
    .replace("jsYaml.safeDump({ tests: toYamlTestCases(testCases) })", "jsYaml.dump({ tests: toYamlTestCases(testCases) })")
    .replace("jsYaml.safeLoad(yaml)", "jsYaml.load(yaml)");

  if (next === source) {
    console.warn("[patch-firebase-tools] yaml_helper.js: expected js-yaml calls not found");
    return true;
  }

  fs.writeFileSync(helperPath, next);
  console.log(`[patch-firebase-tools] patched ${path.relative(repoRoot, helperPath)}`);
  return true;
}

const patched = roots.some((root) => patchFirebaseTools(root));

if (!patched) {
  console.warn("[patch-firebase-tools] firebase-tools not installed, skip");
}
