"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const CreateMethodWithdraw = dynamic(
  () => import("@/features/profile/component/CreateMethodWithdraw"),
  {
    ssr: false,
  }
);

export default function PageClient() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <CreateMethodWithdraw />
      </Suspense>
    </div>
  );
}
