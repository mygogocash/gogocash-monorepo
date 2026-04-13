import { test, expect } from "@playwright/test";
import { PRODUCTION_PAGE_PATHS } from "./production-routes";

const WIDTHS = [375, 320] as const;

for (const path of PRODUCTION_PAGE_PATHS) {
  for (const width of WIDTHS) {
    test(`${path} has no horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(path, { waitUntil: "load", timeout: 90_000 });
      // Layout-dependent widths can settle a tick after `load` in CI browsers.
      await page.waitForTimeout(100);
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const d = document.documentElement;
              return d.scrollWidth - d.clientWidth;
            }),
          { timeout: 5_000 },
        )
        .toBeLessThanOrEqual(1);
      const extra = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth - d.clientWidth;
      });
      expect(
        extra,
        `document scrollWidth exceeds clientWidth by ${extra}px`,
      ).toBeLessThanOrEqual(1);
    });
  }
}
