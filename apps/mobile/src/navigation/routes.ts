export type MobileRouteId =
  | "home"
  | "discover"
  | "brand"
  | "category"
  | "categoryDetail"
  | "shops"
  | "shopDetail"
  | "quest"
  | "golink"
  | "privacyPolicy"
  | "login"
  | "register"
  | "authCallback"
  | "accountSetup"
  | "linkMycashback"
  | "linkMycashbackSignIn"
  | "profile"
  | "profileInfo"
  | "profileConfirmPhone"
  | "profileVerifyPhone"
  | "profileRating"
  | "profileOffers"
  | "wallet"
  | "withdraw"
  | "withdrawMycashback"
  | "method"
  | "methodCreate"
  | "favorite"
  | "referral"
  | "billing"
  | "subscription"
  | "pricing"
  | "membership"
  | "creditScore"
  | "missingOrders"
  | "ageVerification"
  | "language"
  | "privacyCenter"
  | "questHistory"
  | "gogosense"
  | "gogosenseOnboarding"
  | "gogosensePermissions"
  | "gogosenseTimeline"
  | "gogosenseSettings"
  | "gogosenseRecovery"
  | "gogosenseMerchant";

export type MobileFeatureGroup =
  | "auth"
  | "cashback"
  | "discovery"
  | "golink"
  | "gogosense"
  | "legal"
  | "profile"
  | "quest"
  | "shops"
  | "wallet";

export type MobileRoute = {
  id: MobileRouteId;
  webPath: string;
  nativePath: string;
  title: string;
  featureGroup: MobileFeatureGroup;
  requiresAuth: boolean;
};

export const mobileParityRoutes: MobileRoute[] = [
  {
    id: "home",
    webPath: "/",
    nativePath: "/",
    title: "Home",
    featureGroup: "discovery",
    requiresAuth: false,
  },
  {
    id: "discover",
    webPath: "/discover",
    nativePath: "/discover",
    title: "Discover",
    featureGroup: "discovery",
    requiresAuth: false,
  },
  {
    id: "brand",
    webPath: "/brand",
    nativePath: "/brand",
    title: "Brands",
    featureGroup: "discovery",
    requiresAuth: false,
  },
  {
    id: "category",
    webPath: "/category",
    nativePath: "/category",
    title: "Categories",
    featureGroup: "discovery",
    requiresAuth: false,
  },
  {
    id: "categoryDetail",
    webPath: "/category/[name]",
    nativePath: "/category/[name]",
    title: "Category detail",
    featureGroup: "discovery",
    requiresAuth: false,
  },
  {
    id: "shops",
    webPath: "/shops",
    nativePath: "/shops",
    title: "Shops",
    featureGroup: "shops",
    requiresAuth: false,
  },
  {
    id: "shopDetail",
    webPath: "/shop/[id]",
    nativePath: "/shop/[id]",
    title: "Shop detail",
    featureGroup: "shops",
    requiresAuth: false,
  },
  {
    id: "quest",
    webPath: "/quest",
    nativePath: "/quest",
    title: "Quest",
    featureGroup: "quest",
    requiresAuth: false,
  },
  {
    id: "golink",
    webPath: "/golink",
    nativePath: "/golink",
    title: "GoLink",
    featureGroup: "golink",
    requiresAuth: false,
  },
  {
    id: "privacyPolicy",
    webPath: "/privacy-policy",
    nativePath: "/privacy-policy",
    title: "Privacy Policy",
    featureGroup: "legal",
    requiresAuth: false,
  },
  {
    id: "login",
    webPath: "/login",
    nativePath: "/login",
    title: "Login",
    featureGroup: "auth",
    requiresAuth: false,
  },
  {
    id: "register",
    webPath: "/register",
    nativePath: "/register",
    title: "Register",
    featureGroup: "auth",
    requiresAuth: false,
  },
  {
    id: "authCallback",
    webPath: "/auth/callback",
    nativePath: "/auth/callback",
    title: "Auth callback",
    featureGroup: "auth",
    requiresAuth: false,
  },
  {
    id: "accountSetup",
    webPath: "/account-setup",
    nativePath: "/account-setup",
    title: "Account setup",
    featureGroup: "auth",
    requiresAuth: false,
  },
  {
    id: "linkMycashback",
    webPath: "/link-mycashback",
    nativePath: "/link-mycashback",
    title: "Link MyCashback",
    featureGroup: "cashback",
    requiresAuth: false,
  },
  {
    id: "linkMycashbackSignIn",
    webPath: "/link-mycashback/my-cashback-sign-in",
    nativePath: "/link-mycashback/my-cashback-sign-in",
    title: "MyCashback sign in",
    featureGroup: "cashback",
    requiresAuth: false,
  },
  {
    id: "profile",
    webPath: "/profile",
    nativePath: "/profile",
    title: "Profile",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "profileInfo",
    webPath: "/profile/info",
    nativePath: "/profile/info",
    title: "Personal information",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "profileConfirmPhone",
    webPath: "/profile/cf-phone",
    nativePath: "/profile/cf-phone",
    title: "Confirm phone",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "profileVerifyPhone",
    webPath: "/profile/verify-phone",
    nativePath: "/profile/verify-phone",
    title: "Verify phone",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "profileRating",
    webPath: "/profile/my-rating",
    nativePath: "/profile/my-rating",
    title: "My rating",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "profileOffers",
    webPath: "/profile/offer",
    nativePath: "/profile/offer",
    title: "My offers",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "wallet",
    webPath: "/wallet",
    nativePath: "/wallet",
    title: "Wallet",
    featureGroup: "wallet",
    requiresAuth: true,
  },
  {
    id: "withdraw",
    webPath: "/withdraw",
    nativePath: "/withdraw",
    title: "Withdraw",
    featureGroup: "wallet",
    requiresAuth: true,
  },
  {
    id: "withdrawMycashback",
    webPath: "/withdraw/my-cashback",
    nativePath: "/withdraw/my-cashback",
    title: "Withdraw MyCashback",
    featureGroup: "wallet",
    requiresAuth: true,
  },
  {
    id: "method",
    webPath: "/method",
    nativePath: "/method",
    title: "Payment methods",
    featureGroup: "wallet",
    requiresAuth: true,
  },
  {
    id: "methodCreate",
    webPath: "/method/create",
    nativePath: "/method/create",
    title: "Create payment method",
    featureGroup: "wallet",
    requiresAuth: true,
  },
  {
    id: "favorite",
    webPath: "/favorite",
    nativePath: "/favorite",
    title: "Favorites",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "referral",
    webPath: "/referral",
    nativePath: "/referral",
    title: "Referral",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "billing",
    webPath: "/billing",
    nativePath: "/billing",
    title: "Billing",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "subscription",
    webPath: "/subscription",
    nativePath: "/subscription",
    title: "Subscription",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "pricing",
    webPath: "/pricing",
    nativePath: "/pricing",
    title: "Pricing",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "membership",
    webPath: "/membership",
    nativePath: "/membership",
    title: "Membership",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "creditScore",
    webPath: "/credit-score",
    nativePath: "/credit-score",
    title: "Credit score",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "missingOrders",
    webPath: "/missing-orders",
    nativePath: "/missing-orders",
    title: "Missing orders",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "ageVerification",
    webPath: "/age-verification",
    nativePath: "/age-verification",
    title: "Age verification",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "language",
    webPath: "/language",
    nativePath: "/language",
    title: "Language",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "privacyCenter",
    webPath: "/privacy-center",
    nativePath: "/privacy-center",
    title: "Privacy center",
    featureGroup: "profile",
    requiresAuth: true,
  },
  {
    id: "questHistory",
    webPath: "/quest/history",
    nativePath: "/quest/history",
    title: "Quest history",
    featureGroup: "quest",
    requiresAuth: true,
  },
  {
    id: "gogosense",
    webPath: "/gogosense",
    nativePath: "/gogosense",
    title: "GoGoSense",
    featureGroup: "gogosense",
    requiresAuth: true,
  },
  {
    id: "gogosenseOnboarding",
    webPath: "/gogosense/onboarding",
    nativePath: "/gogosense/onboarding",
    title: "GoGoSense onboarding",
    featureGroup: "gogosense",
    requiresAuth: true,
  },
  {
    id: "gogosensePermissions",
    webPath: "/gogosense/permissions",
    nativePath: "/gogosense/permissions",
    title: "GoGoSense permissions",
    featureGroup: "gogosense",
    requiresAuth: true,
  },
  {
    id: "gogosenseTimeline",
    webPath: "/gogosense/timeline",
    nativePath: "/gogosense/timeline",
    title: "GoGoSense timeline",
    featureGroup: "gogosense",
    requiresAuth: true,
  },
  {
    id: "gogosenseSettings",
    webPath: "/gogosense/settings",
    nativePath: "/gogosense/settings",
    title: "GoGoSense settings",
    featureGroup: "gogosense",
    requiresAuth: true,
  },
  {
    id: "gogosenseRecovery",
    webPath: "/gogosense/recovery",
    nativePath: "/gogosense/recovery",
    title: "GoGoSense recovery",
    featureGroup: "gogosense",
    requiresAuth: true,
  },
  {
    id: "gogosenseMerchant",
    webPath: "/gogosense/merchant/[id]",
    nativePath: "/gogosense/merchant/[id]",
    title: "GoGoSense merchant",
    featureGroup: "gogosense",
    requiresAuth: true,
  },
];

export function getProtectedRouteIds(): string[] {
  return mobileParityRoutes.filter((route) => route.requiresAuth).map((route) => route.id);
}

export function findRouteByNativePath(nativePath: string): MobileRoute | undefined {
  return mobileParityRoutes.find((route) => route.nativePath === nativePath);
}

export function findRouteById(routeId: MobileRouteId): MobileRoute {
  const route = mobileParityRoutes.find((candidate) => candidate.id === routeId);

  if (!route) {
    throw new Error(`Unknown GoGoCash mobile route: ${routeId}`);
  }

  return route;
}
