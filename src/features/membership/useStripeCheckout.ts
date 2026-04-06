"use client";

import { FEATURE_FLAGS } from "@/constants/featureFlags";
import type { StripeBillingInterval, StripePlanTier } from "@/lib/stripe/resolveStripePriceId";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useCallback, useState, type RefObject } from "react";
import toast from "react-hot-toast";

type CheckoutMessages = {
  loginRequired: string;
  checkoutError: string;
  notConfigured: string;
  disabled: string;
};

function readBillingInterval(root: HTMLElement | null): StripeBillingInterval {
  const toggle = root?.querySelector("#billing-toggle");
  const annual = toggle?.getAttribute("data-annual") === "true";
  return annual ? "year" : "month";
}

export function useStripeCheckout(
  rootRef: RefObject<HTMLElement | null>,
  messages: CheckoutMessages
) {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [portalPending, setPortalPending] = useState(false);

  const enabled = FEATURE_FLAGS.stripeBilling;

  const startCheckout = useCallback(
    async (tier: StripePlanTier, opts?: { interval?: StripeBillingInterval }) => {
      if (!enabled) {
        toast.error(messages.disabled);
        return;
      }
      if (status !== "authenticated" || !session?.user?.email) {
        toast.error(messages.loginRequired);
        return;
      }
      const interval = opts?.interval ?? readBillingInterval(rootRef.current);
      setPending(true);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier,
            interval,
            locale: locale === "th" ? "th" : "en",
          }),
        });
        const data = (await res.json()) as { error?: string; url?: string };
        if (!res.ok) {
          toast.error(data.error ?? messages.checkoutError);
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        toast.error(messages.checkoutError);
      } catch {
        toast.error(messages.checkoutError);
      } finally {
        setPending(false);
      }
    },
    [enabled, locale, messages, rootRef, session?.user?.email, status]
  );

  const openBillingPortal = useCallback(async () => {
    if (!enabled) {
      toast.error(messages.disabled);
      return;
    }
    if (status !== "authenticated" || !session?.user?.email) {
      toast.error(messages.loginRequired);
      return;
    }
    setPortalPending(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: locale === "th" ? "th" : "en" }),
      });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) {
        toast.error(data.error ?? messages.notConfigured);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(messages.notConfigured);
    } catch {
      toast.error(messages.checkoutError);
    } finally {
      setPortalPending(false);
    }
  }, [enabled, locale, messages, session?.user?.email, status]);

  return {
    startCheckout,
    openBillingPortal,
    pending,
    portalPending,
    stripeBillingEnabled: enabled,
  };
}
