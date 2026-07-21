import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readHomeSources } from "../test-support/homeSource";
import { describe, expect, it } from "vitest";

import { getInteractionTransformStyle, getPressedScaleStyle, motion } from "@mobile/theme/motion";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readHomeFile() {
  return readHomeSources(mobileRoot);
}

describe("Expo motion interaction parity", () => {
  it("motion tokens > given Next css motion contract > then Expo exports matching values", () => {
    expect(motion.duration).toMatchObject({
      fast: 140,
      base: 220,
      emphasis: 320,
      heroAutoplayDelay: 3000,
      accordionChevron: 280,
      accordionExpand: 300,
      scorePulse: 1000,
      shimmer: 1500,
    });
    expect(motion.scale).toMatchObject({
      press: 0.97,
      subtlePress: 0.98,
      hover: 1.01,
      hoverLiftY: -2,
      imageHover: 1.03,
    });
    expect(motion.staggerStep).toBe(50);
  });

  it("press feedback > given pressed state > then Expo applies the Next active scale", () => {
    expect(getPressedScaleStyle(true)).toEqual({
      transform: [{ scale: motion.scale.press }],
    });
    expect(getPressedScaleStyle(false)).toEqual({
      transform: [{ scale: 1 }],
    });
  });

  it("hover feedback > given web pointer hover > then Expo applies lift and subtle scale before press", () => {
    expect(
      getInteractionTransformStyle({ hovered: true, hoverLift: true, pressed: false })
    ).toEqual({
      transform: [{ translateY: motion.scale.hoverLiftY }, { scale: motion.scale.hover }],
    });
    expect(getInteractionTransformStyle({ hovered: true, hoverLift: true, pressed: true })).toEqual(
      {
        transform: [{ translateY: motion.scale.hoverLiftY }, { scale: motion.scale.press }],
      }
    );
    expect(motion.cssTransition).toMatchObject({
      duration: "220ms",
      property: "transform, opacity",
      timingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    });
  });

  it("hover feedback > given pointer leaves a shared pressable > then Expo keeps a stable hover-out transform", () => {
    const motionPressableFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/MotionPressable.tsx"),
      "utf8"
    );

    expect(
      getInteractionTransformStyle({ hovered: false, hoverLift: true, pressed: false })
    ).toEqual({
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
    expect(motionPressableFile).not.toContain("hoverLiftStyle");
    expect(motionPressableFile).not.toContain("restingHoverStyle");
    expect(motionPressableFile).toContain("transitionProperty: motion.cssTransition.property");
    expect(motionPressableFile).toContain("willChange: \"transform\"");
  });

  it("home interactions > given staged carousels > then Expo tracks active dots from scroll", () => {
    const homeFile = readHomeFile();

    // #498 — Top Brands tracks a continuous scroll offset through CarouselRail rather than
    // a settled page index, so its dot bookkeeping is gone. The promo rail still pages.
    expect(homeFile).toContain("getPagedScrollIndex");
    expect(homeFile).toContain("activePromoPage");
    expect(homeFile).toContain("activePromoDot");
    expect(homeFile).toContain("onScroll={Animated.event(");
    expect(homeFile).toContain("onMomentumScrollEnd");
    expect(homeFile).toContain("activeIndex={activePromoDot}");
    // The rail is driven by the same shared scrollX the dots used.
    expect(homeFile).toContain("scrollX={topBrandScrollX}");
  });

  it("home interactions > given tappable home cards and bottom nav > then Expo uses shared press feedback", () => {
    const homeFile = readHomeFile();
    const motionPressableFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/MotionPressable.tsx"),
      "utf8"
    );

    expect(motionPressableFile).toContain("getPressedScaleStyle");
    expect(motionPressableFile).toContain("getInteractionTransformStyle");
    expect(motionPressableFile).toContain("onHoverIn");
    expect(motionPressableFile).toContain("onHoverOut");
    expect(motionPressableFile).toContain("webInteractiveStyle");
    expect(motionPressableFile).toContain("StyleSheet.flatten");
    expect(homeFile).toContain("MotionPressable");
    expect(homeFile).toContain("pressScale={motion.scale.subtlePress}");
  });

  it("home interactions > given search popover is dismissed > then Expo runs exit animation before unmounting", () => {
    const homeFile = readHomeFile();

    expect(homeFile).toContain("searchPopoverMounted");
    expect(homeFile).toContain("closeSearchPopover");
    expect(homeFile).toContain("onExited");
    expect(homeFile).toContain("searchPopoverBackdrop");
    expect(homeFile).toContain('pointerEvents: visible ? "box-none" : "none"');
    expect(homeFile).toContain("Animated.timing");
    expect(homeFile).toContain("motion.easing.in");
    expect(homeFile).toContain("toValue: 0");
  });

  it("golink interactions > given mobile sheet contract > then Expo has backdrop and sheet entrance animation hooks", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerGoLinkScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("Animated");
    expect(screenFile).toContain("backdropOpacity");
    expect(screenFile).toContain("sheetTranslateY");
    expect(screenFile).toContain("Animated.parallel");
    expect(screenFile).toContain("motion.duration.emphasis");
    expect(screenFile).toContain("MotionPressable");
  });

  it("account interactions > given wallet quest profile surfaces > then Expo uses shared hover and press feedback", () => {
    const accountShellFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/AccountPageShell.tsx"),
      "utf8"
    );
    const walletFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerWalletScreen.tsx"),
      "utf8"
    );
    const questFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerQuestScreen.tsx"),
      "utf8"
    );
    const profileFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerProfileScreen.tsx"),
      "utf8"
    );

    for (const file of [accountShellFile, walletFile, questFile, profileFile]) {
      expect(file).toContain("MotionPressable");
      expect(file).not.toContain("Pressable,");
      expect(file).not.toContain("<Pressable");
    }
    expect(walletFile).toContain("https://lin.ee/7om5sAr");
  });
});
