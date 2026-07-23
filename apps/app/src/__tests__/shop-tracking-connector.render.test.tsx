import { describe, expect, it } from "vitest";

import { createShopDetailScreenStyles } from "@mobile/screens/CustomerShopDetailScreen";
import { lightColors } from "@mobile/theme/colorPalettes";

// #502 — the Cashback Tracking Period connector drifted away from the title row.
//
// It used to be positioned as `(tallestStepHeight / 2) - 34`: trackingRow has no
// alignItems so children stretch to the tallest step, trackingItemWrap centred on the
// cross axis, and trackingConnector then applied marginTop: -34 to claw back up. That
// constant was tuned against one snapshot, so the connector moved whenever content grew:
//   no subtitle          66px tall  → centre 33 → y = -1   (above the icon)
//   with subtitle        85px tall  → centre 42.5 → y = 8.5
//   detail wraps 2 lines 100px tall → centre 50 → y = 16   (below the icon)
// Worse, because steps stretch to the TALLEST sibling, a short step's connector was
// positioned by its neighbour's height.
//
// The invariant that actually matters is CONTENT INDEPENDENCE: the connector must sit at
// a fixed offset from the top of the step, derived from the icon, never from how tall the
// step's text happens to be. These assertions encode that rather than a magic number.
const styles = createShopDetailScreenStyles(lightColors);

/** TrackingIcon renders at size={24}, so its centre is half that from the step's top. */
const TRACKING_ICON_SIZE = 24;
const ICON_CENTRE_OFFSET = TRACKING_ICON_SIZE / 2;

describe("shop detail > tracking period connector (#502)", () => {
  it("given steps of differing height > then the connector does not centre on the tallest one", () => {
    // "center" is the specific value that made position depend on sibling content height.
    expect(styles.trackingItemWrap.alignItems).not.toBe("center");
    expect(styles.trackingItemWrap.alignItems).toBe("flex-start");
  });

  it("given the connector > then it is offset to the icon centre, not a tuned constant", () => {
    const marginTop = styles.trackingConnector.marginTop as number;

    expect(marginTop).toBe(ICON_CENTRE_OFFSET);
    // A negative offset is the fingerprint of compensating for cross-axis centring — the
    // exact bug being fixed. Guard it directly so the old shape cannot come back.
    expect(marginTop).toBeGreaterThanOrEqual(0);
  });
});
