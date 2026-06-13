"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export type NoDataWalletReason = "noData" | "filtered";

type NoDataWalletProps = {
  /** `noData` = Figma empty (8439:87090 / 8886:156244 / 8886:156335). `filtered` = zero rows after search/filters. */
  reason?: NoDataWalletReason;
};

const NoDataWallet = ({ reason = "noData" }: NoDataWalletProps) => {
  const t = useTranslations();

  if (reason === "filtered") {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-3 py-16 text-center">
        <Image
          src="/wallet/no_data.png"
          width={190}
          height={123}
          alt=""
          className="mx-auto h-auto w-[min(190px,70vw)] opacity-60"
        />
        <p className="max-w-md text-base font-medium text-[#3b3b3b]">
          {t("walletTransactionsFilteredEmpty")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 py-[72px] text-center">
      <Image
        src="/wallet/no_data.png"
        width={190}
        height={123}
        alt=""
        className="mx-auto h-auto w-[min(190px,70vw)] opacity-60"
      />
      <div className="flex max-w-[640px] flex-col gap-2 px-4">
        <p className="text-2xl font-medium leading-snug text-[#00aa80]">
          {t("walletTransactionsEmptyTitle")}
        </p>
        <p className="text-base font-normal leading-normal text-[#7f7f7f]">
          {t("walletTransactionsEmptySubtitle")}
        </p>
      </div>
    </div>
  );
};

export default NoDataWallet;
