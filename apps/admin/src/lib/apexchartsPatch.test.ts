import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const apexRoot = path.dirname(require.resolve("apexcharts/package.json"));
const patchScript = path.resolve(
  process.cwd(),
  "scripts/patch-apexcharts-border-radius.mjs",
);

describe("ApexCharts stacked border-radius patch", () => {
  it("patches every published runtime bundle and is idempotent", () => {
    execFileSync(process.execPath, [patchScript]);
    execFileSync(process.execPath, [patchScript]);

    const bundleMarkers = {
      "dist/apexcharts.common.js": [
        'B="all"===s.config.plotOptions.bar.borderRadiusWhenStacked',
        ':C',
      ],
      "dist/apexcharts.esm.js": ["radiusWhenStackedAll", "midStackRadius"],
      "dist/apexcharts.min.js": [
        'B="all"===s.config.plotOptions.bar.borderRadiusWhenStacked',
        ':C',
      ],
      "dist/apexcharts.js": ["radiusWhenStackedAll", "midStackRadius"],
    } as const;

    for (const [bundle, markers] of Object.entries(bundleMarkers)) {
      const source = fs.readFileSync(path.join(apexRoot, bundle), "utf8");

      for (const marker of markers) {
        expect(source, bundle).toContain(marker);
      }
    }
  });
});
