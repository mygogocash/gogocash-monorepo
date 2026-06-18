import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const bannerPageSource = readFileSync(
  resolve(process.cwd(), "src/app/(admin)/(others-pages)/banner/page.tsx"),
  "utf8",
);

describe("Banner page surfaces", () => {
  it("renders only backend-supported banner surfaces on the home banner page", () => {
    expect(bannerPageSource).toContain("<BannerTable />");
    expect(bannerPageSource).not.toContain('variant="homeSmall"');
  });
});
