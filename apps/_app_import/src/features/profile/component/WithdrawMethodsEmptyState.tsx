"use client";

import { useTranslations } from "next-intl";
import WithdrawMethodsAddMintButton from "./WithdrawMethodsAddMintButton";
import WithdrawMethodsEmptyIllustration from "./WithdrawMethodsEmptyIllustration";

type Props = {
  onAdd: () => void;
};

export default function WithdrawMethodsEmptyState({ onAdd }: Props) {
  const t = useTranslations();

  return (
    <div className="flex w-full flex-col">
      <h2 className="text-[22px] font-semibold leading-normal text-black md:text-[24px]">
        {t("My withdrawal methods")}
      </h2>
      <div className="mx-auto mt-10 flex w-full max-w-[360px] flex-col items-center gap-6">
        <div className="opacity-60">
          <WithdrawMethodsEmptyIllustration className="mx-auto block shrink-0" />
        </div>
        <p className="text-center text-base font-normal leading-normal text-[#7F7F7F]">
          {t("withdrawMethodsEmptyDescription")}
        </p>
        <WithdrawMethodsAddMintButton onClick={onAdd} />
      </div>
    </div>
  );
}
