import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("useGoGoTrackApi fixtures guard", () => {
  it("useGoGoTrackApi > given fixtures mode > then it skips the live API so demo sessions are not force-logged out", () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, "src/gototrack/useGoGoTrackApi.ts"),
      "utf8",
    );

    expect(source).toContain('env.accountDataSource !== "backend"');
  });
});
