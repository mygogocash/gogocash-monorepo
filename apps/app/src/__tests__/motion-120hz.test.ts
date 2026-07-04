import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { motion } from "@mobile/theme/motion";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("motion 120Hz compositor contract", () => {
  it("css transitions > given shared web motion tokens > then only transform and opacity animate", () => {
    expect(motion.cssTransition.property).toBe("transform, opacity");
  });

  it("MotionPressable > given web hover and press > then feedback is transform-only", () => {
    const source = readMobileFile("src/components/MotionPressable.tsx");

    expect(source).not.toContain("hoverLiftStyle");
    expect(source).not.toContain("restingHoverStyle");
    expect(source).not.toContain("box-shadow");
    expect(source).toContain("transitionProperty: motion.cssTransition.property");
    expect(source).toContain('willChange: "transform"');
  });

  it("animatedMotion helpers > given shared timing wrappers > then default to motion.useNativeDriver", () => {
    const source = readMobileFile("src/theme/animatedMotion.ts");

    expect(source).toContain("runOpacityTiming");
    expect(source).toContain("runTransformTiming");
    expect(source).toContain("runFadeSlideTiming");
    expect(source).toContain("useNativeDriver: config.useNativeDriver ?? motion.useNativeDriver");
  });

  it("GoLink banner collapse > given accordion hide > then uses compositor-friendly scaleY and mount gate", () => {
    const source = readMobileFile("src/screens/home/MobileTabletGoLinkBannerCollapse.tsx");

    expect(source).toContain("scaleY");
    expect(source).toContain("bannerMounted");
    expect(source).toContain("runTransformTiming");
    expect(source).not.toContain("useLayoutNativeDriver");
    expect(source).not.toContain("animatedHeight");
  });

  it("auth web polish > given OTP and consent cells > then CSS transitions avoid paint-heavy properties", () => {
    const source = readMobileFile("src/screens/CustomerAuthScreen.tsx");

    expect(source).toContain('transitionProperty: "transform, opacity"');
    expect(source).not.toContain('transitionProperty: "background-color, border-color, box-shadow"');
    expect(source).not.toContain(
      'transitionProperty: "transform, border-color, box-shadow, background-color"'
    );
  });
});
