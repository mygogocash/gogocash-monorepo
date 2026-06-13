"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const WalletTransaction = dynamic(
  () => import("@/features/transaction/component/WalletTransaction"),
  { ssr: false }
);

/** Wallet page entry: code-split grid. */
export default function ClientLayoutWallet() {
  return (
    <Suspense fallback={null}>
      <WalletTransaction />
    </Suspense>
  );
}
