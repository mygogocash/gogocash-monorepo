"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

const STORAGE_KEY = "gc_membership_checkout_toast";

/**
 * Shows one-shot toasts for `?checkout=success|cancel` after Stripe redirects back.
 */
export default function MembershipCheckoutNotifier() {
  const t = useTranslations("membership");
  const searchParams = useSearchParams();

  useEffect(() => {
    const c = searchParams.get("checkout");
    if (c !== "success" && c !== "cancel") return;
    if (typeof window === "undefined") return;
    try {
      const seen = window.sessionStorage.getItem(STORAGE_KEY);
      const token = `${c}:${searchParams.toString()}`;
      if (seen === token) return;
      window.sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
      /* storage blocked */
    }
    if (c === "success") {
      toast.success(t("stripeCheckoutSuccess"));
    } else {
      toast(t("stripeCheckoutCancelled"));
    }
  }, [searchParams, t]);

  return null;
}
