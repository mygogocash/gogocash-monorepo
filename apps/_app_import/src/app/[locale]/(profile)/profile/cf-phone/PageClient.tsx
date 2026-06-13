"use client";

import dynamic from "next/dynamic";

const CFNumberPhone = dynamic(() => import("@/features/profile/component/CFNumberPhone"), {
  ssr: false,
});

export default function PageClient() {
  return (
    <div className="h-full w-full">
      <CFNumberPhone />
      <div id="recaptcha-container"></div>
    </div>
  );
}
