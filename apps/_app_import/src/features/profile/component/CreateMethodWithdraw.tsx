"use client";

import { DataMethodWithdraw } from "@/interfaces/withdraw";
import { fetcher } from "@/lib/axios/client";
import SubPage from "../layout/SubPage";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { EMPTY_FORM, methodToForm } from "./createMethodWithdrawModel";
import { CreateMethodWithdrawForm } from "./CreateMethodWithdrawForm";

export default function CreateMethodWithdraw() {
  const t = useTranslations();
  const param = useSearchParams();
  const id = param.get("id");

  const {
    data: detail,
    isLoading,
    refetch: refetchDetail,
  } = useQuery<DataMethodWithdraw>({
    queryKey: ["getDetailMethodWithdraw", id],
    queryFn: () => fetcher(`/withdraw/methods/${id}`),
    enabled: Boolean(id),
  });

  useEffect(() => {
    const handleFocus = () => refetchDetail();
    handleFocus();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchDetail]);

  if (id && isLoading) {
    return (
      <SubPage title="Withdraw Method" showSubMenu>
        <p className="mt-10 text-center text-[#7F7F7F]">Loading...</p>
      </SubPage>
    );
  }

  if (id && !isLoading && !detail) {
    return (
      <SubPage title="Withdraw Method" showSubMenu>
        <p className="mt-10 text-center text-[#7F7F7F]">{t("withdrawMethodLoadError")}</p>
      </SubPage>
    );
  }

  const initialForm = id && detail ? methodToForm(detail) : EMPTY_FORM;

  return <CreateMethodWithdrawForm key={id ?? "new"} methodId={id} initialForm={initialForm} />;
}
