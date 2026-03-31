"use client";

import dynamic from "next/dynamic";

const MyWalletWithdraw = dynamic(() => import("@/features/wallet/component/MyWalletWithdraw"));

export default function PageClient() {
  return (
    <div className="gc-page-block h-full w-full">
      <MyWalletWithdraw />
    </div>
  );
}
