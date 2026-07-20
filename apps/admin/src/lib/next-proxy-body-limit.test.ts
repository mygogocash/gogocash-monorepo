import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { MAX_PROXY_BODY_BYTES } from "./backendProxy";
import { MAX_ADMIN_UPLOAD_BYTES } from "./uploadLimits";

describe("next.config proxyClientMaxBodySize (#487)", () => {
  it("keeps the Next proxy buffer at least as large as the BFF body limit", () => {
    const configSource = readFileSync(
      resolve(__dirname, "../../next.config.ts"),
      "utf8",
    );
    expect(configSource).toMatch(/proxyClientMaxBodySize:\s*32\s*\*\s*1024\s*\*\s*1024/);
    expect(MAX_PROXY_BODY_BYTES).toBe(MAX_ADMIN_UPLOAD_BYTES);
    expect(MAX_ADMIN_UPLOAD_BYTES).toBe(32 * 1024 * 1024);
  });
});
