import type { MobileRouteId } from "./routes";

export type ExpoConversionStatus = "migrated" | "parity_shell" | "backend_migration";

export type ExpoConversionRouteOwnership = {
  webPath: string;
  expoRouteId: MobileRouteId;
  status: ExpoConversionStatus;
  owner: "expo_customer" | "backend_migration";
};

export const expoConversionRouteOwnership: ExpoConversionRouteOwnership[] = [
  { webPath: "/", expoRouteId: "home", status: "migrated", owner: "expo_customer" },
  { webPath: "/account-setup", expoRouteId: "accountSetup", status: "migrated", owner: "expo_customer" },
  { webPath: "/age-verification", expoRouteId: "ageVerification", status: "migrated", owner: "expo_customer" },
  { webPath: "/auth/callback", expoRouteId: "authCallback", status: "migrated", owner: "expo_customer" },
  { webPath: "/billing", expoRouteId: "billing", status: "migrated", owner: "expo_customer" },
  { webPath: "/brand", expoRouteId: "brand", status: "migrated", owner: "expo_customer" },
  { webPath: "/category", expoRouteId: "category", status: "migrated", owner: "expo_customer" },
  { webPath: "/category/[name]", expoRouteId: "categoryDetail", status: "migrated", owner: "expo_customer" },
  { webPath: "/credit-score", expoRouteId: "creditScore", status: "migrated", owner: "expo_customer" },
  { webPath: "/discover", expoRouteId: "discover", status: "migrated", owner: "expo_customer" },
  { webPath: "/favorite", expoRouteId: "favorite", status: "migrated", owner: "expo_customer" },
  { webPath: "/golink", expoRouteId: "golink", status: "migrated", owner: "expo_customer" },
  { webPath: "/language", expoRouteId: "language", status: "migrated", owner: "expo_customer" },
  { webPath: "/link-mycashback", expoRouteId: "linkMycashback", status: "migrated", owner: "expo_customer" },
  {
    webPath: "/link-mycashback/my-cashback-sign-in",
    expoRouteId: "linkMycashbackSignIn",
    status: "migrated",
    owner: "expo_customer",
  },
  { webPath: "/login", expoRouteId: "login", status: "migrated", owner: "expo_customer" },
  { webPath: "/membership", expoRouteId: "membership", status: "migrated", owner: "expo_customer" },
  { webPath: "/method", expoRouteId: "method", status: "migrated", owner: "expo_customer" },
  { webPath: "/method/create", expoRouteId: "methodCreate", status: "migrated", owner: "expo_customer" },
  { webPath: "/missing-orders", expoRouteId: "missingOrders", status: "migrated", owner: "expo_customer" },
  { webPath: "/pricing", expoRouteId: "pricing", status: "migrated", owner: "expo_customer" },
  { webPath: "/privacy-center", expoRouteId: "privacyCenter", status: "migrated", owner: "expo_customer" },
  { webPath: "/privacy-policy", expoRouteId: "privacyPolicy", status: "migrated", owner: "expo_customer" },
  { webPath: "/profile", expoRouteId: "profile", status: "migrated", owner: "expo_customer" },
  { webPath: "/profile/cf-phone", expoRouteId: "profileConfirmPhone", status: "migrated", owner: "expo_customer" },
  { webPath: "/profile/info", expoRouteId: "profileInfo", status: "migrated", owner: "expo_customer" },
  { webPath: "/profile/my-rating", expoRouteId: "profileRating", status: "migrated", owner: "expo_customer" },
  { webPath: "/profile/offer", expoRouteId: "profileOffers", status: "migrated", owner: "expo_customer" },
  { webPath: "/profile/verify-phone", expoRouteId: "profileVerifyPhone", status: "migrated", owner: "expo_customer" },
  { webPath: "/quest", expoRouteId: "quest", status: "migrated", owner: "expo_customer" },
  { webPath: "/quest/history", expoRouteId: "questHistory", status: "migrated", owner: "expo_customer" },
  { webPath: "/referral", expoRouteId: "referral", status: "migrated", owner: "expo_customer" },
  { webPath: "/register", expoRouteId: "register", status: "migrated", owner: "expo_customer" },
  { webPath: "/shop/[id]", expoRouteId: "shopDetail", status: "migrated", owner: "expo_customer" },
  { webPath: "/shops", expoRouteId: "shops", status: "migrated", owner: "expo_customer" },
  { webPath: "/subscription", expoRouteId: "subscription", status: "migrated", owner: "expo_customer" },
  { webPath: "/wallet", expoRouteId: "wallet", status: "migrated", owner: "expo_customer" },
  { webPath: "/withdraw", expoRouteId: "withdraw", status: "migrated", owner: "expo_customer" },
  { webPath: "/withdraw/my-cashback", expoRouteId: "withdrawMycashback", status: "migrated", owner: "expo_customer" },
];

export const nextCustomerRoutes = expoConversionRouteOwnership.map(({ webPath }) => ({
  webPath,
}));

export function getMigratedExpoRouteIds(): MobileRouteId[] {
  return expoConversionRouteOwnership
    .filter((route) => route.status === "migrated")
    .map((route) => route.expoRouteId);
}
