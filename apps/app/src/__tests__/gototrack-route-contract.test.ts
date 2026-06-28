import { describe, expect, it } from "vitest";

import { deepLinkRoutes } from "@mobile/config/mobileAppConfig";
import { findRouteById, getProtectedRouteIds, mobileParityRoutes } from "@mobile/navigation/routes";

const gototrackRouteIds = [
  "gototrack",
  "gototrackOnboarding",
  "gototrackPermissions",
  "gototrackTimeline",
  "gototrackSettings",
  "gototrackRecovery",
  "gototrackMerchant",
] as const;

describe("GoGoTrack Expo route contract", () => {
  it("expo route parity > given GoGoTrack MVP screens > then every route has Expo ownership", () => {
    expect(mobileParityRoutes.map((route) => route.id)).toEqual(
      expect.arrayContaining([...gototrackRouteIds])
    );

    for (const routeId of gototrackRouteIds) {
      expect(findRouteById(routeId)).toMatchObject({
        featureGroup: "gototrack",
        requiresAuth: true,
      });
    }
  });

  it("gototrack routes > given protected tracking screens > then all require auth", () => {
    expect(getProtectedRouteIds()).toEqual(expect.arrayContaining([...gototrackRouteIds]));
  });

  it("deep link contract > given notification activation CTA > then exposes GoGoTrack links", () => {
    expect(deepLinkRoutes).toMatchObject({
      gototrack: "gogocash://gototrack",
      gototrackActivation: "gogocash://gototrack/activate",
    });
  });
});
