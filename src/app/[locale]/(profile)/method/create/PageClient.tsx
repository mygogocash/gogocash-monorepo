"use client";

import dynamic from "next/dynamic";

const CreateMethodWithdraw = dynamic(
  () => import("@/features/profile/component/CreateMethodWithdraw"),
  {
    ssr: false,
  }
);

export default function PageClient() {
  return (
    <div className="h-full w-full">
      <CreateMethodWithdraw />
    </div>
  );
}
