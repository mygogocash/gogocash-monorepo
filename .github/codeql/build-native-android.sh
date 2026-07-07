#!/usr/bin/env bash
# Compile the Expo Android project so CodeQL can trace Kotlin (GoGoTrack module + RN).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$ROOT/apps/app"

cd "$ROOT"
npm ci

cd "$APP_DIR"

node <<'NODE'
const fs = require("fs");
const path = require("path");

const pkgPath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

pkg.expo = pkg.expo ?? {};
pkg.expo.autolinking = {
  ...(pkg.expo.autolinking ?? {}),
  searchPaths: ["./modules"],
};
pkg.dependencies = pkg.dependencies ?? {};
pkg.dependencies["gototrack-detector"] = "file:./modules/gototrack-detector";

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
NODE

export CI=1
npx expo prebuild --platform android --no-install --clean

cd android
chmod +x gradlew
./gradlew :app:compileDebugKotlin --no-daemon --stacktrace
