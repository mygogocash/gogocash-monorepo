"use client";

import dynamic from "next/dynamic";

const MyWalletWithdraw = dynamic(() => import("@/features/wallet/component/MyWalletWithdraw"));

export default function PageClient() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <MyWalletWithdraw />
    </div>
  );
}
