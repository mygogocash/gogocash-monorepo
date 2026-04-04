"use client";

import { createCheckoutSession } from "../actions";
import type { PlanId } from "../types";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useCheckout() {
  const locale = useLocale();
  const billingLocale = locale === "th" ? "th" : "en";
  const t = useTranslations("subscription");

  return useMutation({
    mutationFn: (planId: PlanId) => createCheckoutSession(planId, billingLocale),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg && msg !== "Unauthorized" ? msg : t("errorToast"));
    },
  });
}
