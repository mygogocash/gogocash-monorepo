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

cd ios
xcodebuild \
  -workspace GoGoCash.xcworkspace \
  -scheme GoGoCash \
  -sdk iphonesimulator \
  -destination "generic/platform=iOS Simulator" \
  CODE_SIGNING_ALLOWED=NO \
  build
