import { createElement, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@mobile/components/Toast";
import { ProfileAvatarImage } from "@mobile/components/ProfileAvatarImage";
import { ProfileHeroCard } from "@mobile/components/ProfileHeroCard";

// Profile photos are cropped to a circle for EVERY member. Before this suite the circular
// clip was supplied only by the <GoGoPassAvatar> premium branch (borderRadius: size/2 +
// overflow: hidden), so non-premium members — and, once isGoGoPassEnabled() is off, every
// member — saw a square avatar in ProfileHeroCard and CustomerProfileBar. The clip now lives
// on the ProfileAvatarImage primitive so it holds regardless of tier or feature flag.
//
// A "full" radius here means radii.chip (999), not size/2: ProfileHeroCard,
// CustomerProfileBar and CustomerProfileMenu all override height/width to "100%", which
// decouples the `size` prop from the box actually rendered. 999 clamps to a circle at any
// dimension; size/2 would render a lozenge whenever the two diverge.
const FULL_RADIUS_PX = 999;

function borderRadiusOf(element: Element): string {
  return getComputedStyle(element).borderRadius;
}

/** react-native-web renders accessibilityLabel as aria-label; the avatar is the only img role. */
function findAvatarElement(): Element {
  const labelled = screen.getAllByLabelText("Avatar");
  const avatar = labelled.find((element) => borderRadiusOf(element) !== "");
  return avatar ?? labelled[0];
}

describe("profile avatar > circular crop for every member", () => {
  it("ProfileAvatarImage > given any member > then the image is clipped to a full circle", () => {
    render(
      createElement(ProfileAvatarImage, {
        accessibilityLabel: "Avatar",
        avatarUrl: null,
        size: 96,
      }),
    );

    expect(borderRadiusOf(findAvatarElement())).toBe(`${FULL_RADIUS_PX}px`);
  });

  it("ProfileAvatarImage > given a caller that stretches it to 100% > then it is still a circle", () => {
    // The three tier-dependent call sites pass {height:"100%",width:"100%"}, discarding `size`.
    render(
      createElement(ProfileAvatarImage, {
        accessibilityLabel: "Avatar",
        avatarUrl: null,
        size: 96,
        style: { height: "100%", width: "100%" },
      }),
    );

    expect(borderRadiusOf(findAvatarElement())).toBe(`${FULL_RADIUS_PX}px`);
  });

  it("ProfileAvatarImage > given a caller that tries to set its own radius > then it is rejected and stays a circle", () => {
    // The radius is owned by the primitive, so `style` must not advertise a borderRadius a
    // caller can never actually apply. The @ts-expect-error below is the real assertion: it
    // fails `tsc --noEmit` ("unused '@ts-expect-error' directive") unless the prop type
    // rejects borderRadius. The runtime expectation pins the enforced-merge behaviour too.
    render(
      createElement(ProfileAvatarImage, {
        accessibilityLabel: "Avatar",
        avatarUrl: null,
        size: 96,
        // @ts-expect-error — borderRadius is owned by ProfileAvatarImage; callers cannot set it.
        style: { borderRadius: 8 },
      }),
    );

    expect(borderRadiusOf(findAvatarElement())).toBe(`${FULL_RADIUS_PX}px`);
  });

  it("ProfileAvatarImage > given a caller that tries to square one corner > then it is rejected", () => {
    // Per-corner radii beat the `borderRadius` shorthand in RN and CSS, so omitting only
    // "borderRadius" would still let a caller square a corner and break the circle.
    render(
      createElement(ProfileAvatarImage, {
        accessibilityLabel: "Avatar",
        avatarUrl: null,
        size: 96,
        // @ts-expect-error — per-corner radii are owned by ProfileAvatarImage too.
        style: { borderTopLeftRadius: 0 },
      }),
    );

    expect(borderRadiusOf(findAvatarElement())).toBe(`${FULL_RADIUS_PX}px`);
  });

  it("ProfileHeroCard > given a non-GoGoPass member > then the avatar is still cropped to a circle", () => {
    // Regression for the reported bug: membership_tier absent => GoGoPassAvatar takes its
    // non-premium branch, which applies no clipping of its own.
    const hero: ReactElement = createElement(ProfileHeroCard, {
      session: { username: "Kunanon Jarat" },
    } as never);
    render(createElement(ToastProvider, {}, hero));

    expect(borderRadiusOf(findAvatarElement())).toBe(`${FULL_RADIUS_PX}px`);
  });
});
