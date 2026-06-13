"use client";

import dynamic from "next/dynamic";

const MyOffer = dynamic(() => import("@/features/profile/component/MyOffer"), {
  ssr: false,
});

export default function PageClient() {
  return (
    <div className="h-full w-full">
      <MyOffer />
    </div>
  );
}
