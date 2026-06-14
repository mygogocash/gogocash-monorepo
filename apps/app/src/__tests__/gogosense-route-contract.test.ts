import { describe, expect, it } from "vitest";

import { deepLinkRoutes } from "@mobile/config/mobileAppConfig";
import { findRouteById, getProtectedRouteIds, mobileParityRoutes } from "@mobile/navigation/routes";

const gogosenseRouteIds = [
  "gogosense",
  "gogosenseOnboarding",
  "gogosensePermissions",
  "gogosenseTimeline",
  "gogosenseSettings",
  "gogosenseRecovery",
  "gogosenseMerchant",
] as const;

describe("GoGoSense Expo route contract", () => {
  it("expo route parity > given GoGoSense MVP screens > then every route has Expo ownership", () => {
    expect(mobileParityRoutes.map((route) => route.id)).toEqual(
      expect.arrayContaining([...gogosenseRouteIds])
    );

    for (const routeId of gogosenseRouteIds) {
      expect(findRouteById(routeId)).toMatchObject({
        featureGroup: "gogosense",
        requiresAuth: true,
      });
    }
  });

  it("gogosense routes > given protected tracking screens > then all require auth", () => {
    expect(getProtectedRouteIds()).toEqual(expect.arrayContaining([...gogosenseRouteIds]));
  });

  it("deep link contract > given notification activation CTA > then exposes GoGoSense links", () => {
    expect(deepLinkRoutes).toMatchObject({
      gogosense: "gogocash://gogosense",
      gogosenseActivation: "gogocash://gogosense/activate",
    });
  });
});
