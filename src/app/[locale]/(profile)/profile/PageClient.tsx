"use client";

import dynamic from "next/dynamic";

const ProfileInfo = dynamic(() => import("@/features/profile/component/ProfileInfo"), {
  ssr: false,
});
const ProfileMenu = dynamic(() => import("@/features/profile/component/ProfileMenu"), {
  ssr: false,
});

export default function PageClient() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <div className="block h-full min-h-0 w-full min-w-0 md:hidden">
        <ProfileMenu />
      </div>
      <div className="hidden h-full min-h-0 w-full min-w-0 flex-1 md:block">
        <ProfileInfo />
      </div>
    </div>
  );
}
