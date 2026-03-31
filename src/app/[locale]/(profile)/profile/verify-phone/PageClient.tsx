"use client";

import dynamic from "next/dynamic";

const VerifyNumberPhone = dynamic(() => import("@/features/profile/component/VerifyNumberPhone"), {
  ssr: false,
});

export default function PageClient() {
  return (
    <div className="h-full w-full">
      <VerifyNumberPhone />
      <div id="recaptcha-container"></div>
    </div>
  );
}
