/**
 * expo-firebase-core@6 (pulled by expo-firebase-recaptcha) uses Gradle APIs removed in
 * Gradle 8+ / Expo SDK 57. Patch android/build.gradle so EAS and local Android builds succeed.
 * Idempotent: safe to run multiple times.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");

const candidates = [
  path.join(appRoot, "node_modules", "expo-firebase-core"),
  path.join(repoRoot, "node_modules", "expo-firebase-core"),
];

const packageRoot = candidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "android", "build.gradle"))
);

if (!packageRoot) {
  console.warn("[patch-expo-firebase-core] expo-firebase-core not installed, skip");
  process.exit(0);
}

const gradlePath = path.join(packageRoot, "android", "build.gradle");
let source = fs.readFileSync(gradlePath, "utf8");

const MARKER = "archiveClassifier.set('sources')";
if (source.includes(MARKER)) {
  console.log("[patch-expo-firebase-core] already patched");
  process.exit(0);
}

const OLD_SOURCES_JAR = `task androidSourcesJar(type: Jar) {
  classifier = 'sources'
  from android.sourceSets.main.java.srcDirs
}`;

const NEW_SOURCES_JAR = `task androidSourcesJar(type: Jar) {
  archiveClassifier.set('sources')
  from android.sourceSets.main.java.srcDirs
}`;

if (!source.includes(OLD_SOURCES_JAR)) {
  console.warn(
    "[patch-expo-firebase-core] androidSourcesJar block changed (expo-firebase-core version bump?)"
  );
  process.exit(0);
}

source = source.replace(OLD_SOURCES_JAR, NEW_SOURCES_JAR);

const OLD_PUBLISH = `      release(MavenPublication) {
        from components.release
        // Add additional sourcesJar to artifacts
        artifact(androidSourcesJar)
      }`;

const NEW_PUBLISH = `      release(MavenPublication) {
        def releaseComponent = components.findByName('release')
        if (releaseComponent != null) {
          from releaseComponent
        }
        // Add additional sourcesJar to artifacts
        artifact(androidSourcesJar)
      }`;

if (source.includes(OLD_PUBLISH)) {
  source = source.replace(OLD_PUBLISH, NEW_PUBLISH);
} else if (!source.includes("components.findByName('release')")) {
  console.warn("[patch-expo-firebase-core] publishing block changed, sources jar only");
}

fs.writeFileSync(gradlePath, source);
console.log("[patch-expo-firebase-core] patched", gradlePath);
