#!/usr/bin/env bash
# Compile the Expo iOS project so CodeQL can trace Swift (GoGoTrack live activity module).
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
pkg.dependencies["gototrack-live-activity"] = "file:./modules/gototrack-live-activity";

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
NODE

export CI=1
npx expo prebuild --platform ios --no-install --clean

# Prebuild emits Podfile + xcodeproj; CocoaPods workspace is required before xcodebuild.
npx pod-install ios

cd ios

WORKSPACE="$(find . -maxdepth 1 -name '*.xcworkspace' -print -quit)"
if [[ -n "$WORKSPACE" ]]; then
  xcodebuild \
    -workspace "$(basename "$WORKSPACE")" \
    -scheme GoGoCash \
    -sdk iphonesimulator \
    -destination "generic/platform=iOS Simulator" \
    CODE_SIGNING_ALLOWED=NO \
    build
else
  xcodebuild \
    -project GoGoCash.xcodeproj \
    -scheme GoGoCash \
    -sdk iphonesimulator \
    -destination "generic/platform=iOS Simulator" \
    CODE_SIGNING_ALLOWED=NO \
    build
fi
