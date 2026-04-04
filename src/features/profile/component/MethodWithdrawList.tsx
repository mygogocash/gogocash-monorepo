"use client";

import SubPage from "../layout/SubPage";
import WithdrawMethodsAddMintButton from "./WithdrawMethodsAddMintButton";
import WithdrawMethodBankCard from "./WithdrawMethodBankCard";
import WithdrawMethodsEmptyState from "./WithdrawMethodsEmptyState";
import { DataMethodWithdraw } from "@/interfaces/withdraw";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/axios/client";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

const MethodWithdrawList = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslations();
  const {
    data: methodsList,
    refetch,
    isLoading,
  } = useQuery<DataMethodWithdraw[]>({
    queryKey: ["methodsList"],
    queryFn: () => fetcher(`/withdraw/methods-list`),
    enabled: session?.user !== undefined,
  });

  useEffect(() => {
    if (session?.user?._id) {
      const handleFocus = () => refetch();
      handleFocus();
      window.addEventListener("focus", handleFocus);
      return () => window.removeEventListener("focus", handleFocus);
    }
  }, [session?.user?._id, refetch]);

  if (isLoading) {
    return (
      <SubPage title="Withdraw Method" showSubMenu>
        <div className="flex w-full min-w-0 flex-col gap-10" aria-busy="true" aria-live="polite">
          <span className="sr-only">{t("pageLoading")}</span>
          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="h-8 w-[min(280px,60%)] max-w-[320px] animate-pulse rounded-2xl bg-[#ebebeb]" />
            <div className="h-10 w-[140px] shrink-0 animate-pulse rounded-full bg-[#e8f5f0]" />
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
            {[0, 1].map((key) => (
              <div
                key={key}
                className="h-[183px] w-full min-w-0 animate-pulse rounded-2xl bg-[#ebebeb]"
              />
            ))}
          </div>
        </div>
      </SubPage>
    );
  }

  return (
    <SubPage title="Withdraw Method" showSubMenu>
      {methodsList && methodsList.length > 0 ? (
        <div className="flex w-full min-w-0 flex-col gap-10">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
            <h2 className="min-h-px min-w-px flex-1 text-[22px] font-semibold leading-normal text-black md:text-[24px]">
              {t("My withdrawal methods")}
            </h2>
            <WithdrawMethodsAddMintButton onClick={() => router.push("/method/create")} />
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
            {methodsList.map((method: DataMethodWithdraw) => (
              <WithdrawMethodBankCard
                key={method._id}
                method={method}
                onSelect={() => router.push(`/method/create?id=${method._id}`)}
              />
            ))}
          </div>
        </div>
      ) : (
        <WithdrawMethodsEmptyState onAdd={() => router.push("/method/create")} />
      )}
    </SubPage>
  );
};

export default MethodWithdrawList;
