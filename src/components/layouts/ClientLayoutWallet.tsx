"use client";

import dynamic from "next/dynamic";

const WalletTransaction = dynamic(
  () => import("@/features/transaction/component/WalletTransaction"),
  { ssr: false }
);

/** Wallet page entry: code-split grid; Crossmint does not block paint (see ClientLayoutWrapper). */
export default function ClientLayoutWallet() {
  return <WalletTransaction />;
}
