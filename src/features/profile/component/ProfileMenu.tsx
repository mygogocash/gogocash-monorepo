"use client";

import SubProfile from "@/components/layouts/SubProfile";
import SubPage from "../layout/SubPage";
import BoardProfile from "./BoardProfile";

/**
 * Mobile profile hub — same navigation model as desktop `SubPage` + `SubProfile` panel
 * (Profile sub-links, wallet, favorites, referral, privacy, help, connect, log out).
 */
const ProfileMenu = () => {
  return (
    <SubPage title="Profile">
      <div className="flex w-full min-w-0 flex-col gap-4">
        <BoardProfile />
        <SubProfile variant="panel" className="w-full min-w-0 flex-none shrink-0" />
      </div>
    </SubPage>
  );
};

export default ProfileMenu;
