#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = resolve("scripts/inject-staging-auth-wallet.mjs");

describe("inject-staging-auth-wallet", () => {
  it("inject script > given token sources > then prefers CLI and env before evidence", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain("--auth-token");
    expect(source).toContain("GOGOTRACK_AUTH_TOKEN");
    expect(source).toContain("GOGOSENSE_AUTH_TOKEN");
    expect(source).toContain("readTokenFromEvidence");
    expect(source.indexOf("GOGOTRACK_AUTH_TOKEN")).toBeLessThan(
      source.indexOf("readTokenFromEvidence()"),
    );
  });
});
