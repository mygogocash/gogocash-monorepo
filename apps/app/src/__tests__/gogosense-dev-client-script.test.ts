import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

type PackageJson = {
  scripts?: Record<string, string>;
};

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json") as PackageJson;

describe("GoGoSense Android dev-client script", () => {
  it("pins the Metro flags needed for Android dev-client acceptance", () => {
    const script = packageJson.scripts?.["gogosense:dev-client"];

    expect(script).toContain("NODE_PATH=$PWD/node_modules");
    expect(script).toContain("NODE_OPTIONS=--dns-result-order=ipv4first");
    expect(script).toContain("expo start");
    expect(script).toContain("--dev-client");
    expect(script).toContain("--host localhost");
    expect(script).toContain("--port 8081");
    expect(script).toContain("--clear");
  });
});
