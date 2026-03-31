"use client";

import dynamic from "next/dynamic";

const ProfileInfo = dynamic(() => import("@/features/profile/component/ProfileInfo"), {
  ssr: false,
});

export default function PageClient() {
  return (
    <div className="h-full w-full">
      <ProfileInfo />
    </div>
  );
}
