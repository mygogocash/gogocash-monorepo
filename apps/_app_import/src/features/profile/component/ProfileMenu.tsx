"use client";

import SubProfile from "@/components/layouts/SubProfile";
import SubPage from "../layout/SubPage";
import BoardProfile from "./BoardProfile";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

const PROFILE_MENU_PREFETCH_ROUTES = [
  "/profile",
  "/profile/info",
  "/profile/verify-phone",
  "/profile/cf-phone",
  "/wallet",
  "/withdraw",
  "/withdraw/my-cashback",
  "/favorite",
  "/method",
  "/method/create",
  "/language",
  "/missing-orders",
  "/membership",
  "/credit-score",
  "/referral",
  "/quest/history",
  "/privacy-center",
  "/age-verification",
  "/subscription",
  "/pricing",
  "/billing",
] as const;

/**
 * Mobile profile hub — same navigation model as desktop `SubPage` + `SubProfile` panel
 * (Profile sub-links, wallet, favorites, referral, privacy, help, connect, log out).
 */
const ProfileMenu = () => {
  const router = useRouter();

  useEffect(() => {
    PROFILE_MENU_PREFETCH_ROUTES.forEach((href) => {
      router.prefetch(href);
    });
  }, [router]);

  return (
    <SubPage title="Profile">
      {/*
        Mobile profile hub: same dark gradient cashback card as desktop `BoardProfile` (ProfileInfo),
        separated from the nav rail by gap — not a split “half card” with flat bottom.
      */}
      <div className="flex w-full min-w-0 flex-col gap-4">
        <BoardProfile className="mb-0 md:mb-8" />
        <SubProfile
          variant="panel"
          className="w-full min-w-0 flex-none shrink-0 pb-4 pt-0 md:pb-0 md:pt-0"
        />
      </div>
    </SubPage>
  );
};

export default ProfileMenu;
