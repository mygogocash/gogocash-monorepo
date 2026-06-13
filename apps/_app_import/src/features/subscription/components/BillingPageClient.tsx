"use client";

import { Alert, Box, Button, Typography } from "@mui/material";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { startTransition, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { BillingButton } from "./BillingButton";
import BillingPageSkeleton from "./BillingPageSkeleton";
import { SubscriptionStatus } from "./SubscriptionStatus";
import { useSubscription } from "../hooks/useSubscription";

export default function BillingPageClient() {
  const t = useTranslations("subscription");
  const searchParams = useSearchParams();
  const successToastFired = useRef(false);
  const [statusPulse, setStatusPulse] = useState(false);
  const { data, isLoading } = useSubscription();

  useEffect(() => {
    if (searchParams.get("success") !== "true" || successToastFired.current) {
      return;
    }
    successToastFired.current = true;
    toast.success(t("successToast"), { duration: 6000 });
    startTransition(() => setStatusPulse(true));
    const id = window.setTimeout(() => {
      startTransition(() => setStatusPulse(false));
    }, 1100);
    return () => window.clearTimeout(id);
  }, [searchParams, t]);

  if (!FEATURE_FLAGS.stripeBilling) {
    return (
      <div className="gc-page-block">
        <div className="container max-w-[600px]">
          <Alert
            severity="info"
            sx={{
              borderRadius: "var(--gc-radius-md)",
              borderColor: "var(--gc-border)",
              bgcolor: "var(--gc-surface)",
              color: "var(--gc-text)",
            }}
          >
            {t("stripeDisabled")}{" "}
            <Link href="/membership" className="gc-inline-link">
              {t("stripeDisabledCta")}
            </Link>
          </Alert>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return <BillingPageSkeleton />;
  }

  const intervalLabel =
    data.planId === "thb_annual_490"
      ? t("billing.intervalAnnual")
      : data.planId === "thb_monthly_49"
        ? t("billing.intervalMonthly")
        : "";

  const planHeading =
    intervalLabel !== "" ? `${t("billing.planName")} · ${intervalLabel}` : t("billing.planName");

  const periodEnd =
    data.currentPeriodEnd != null
      ? data.currentPeriodEnd.toLocaleString(undefined, { dateStyle: "medium" })
      : null;

  if (data.status === "none" && !data.stripeCustomerId) {
    return (
      <div className="gc-page-block">
        <div className="container max-w-[560px]">
          <Typography
            component="p"
            className="gc-kicker"
            sx={{ mb: 1, color: "var(--gc-text-muted)" }}
          >
            {t("billing.kicker")}
          </Typography>
          <Typography
            component="h1"
            className="gc-section-title"
            sx={{ mb: 4, fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
          >
            {t("billing.title")}
          </Typography>
          <Box
            className="gc-soft-panel"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              py: 5,
              px: 3,
              borderRadius: "var(--gc-radius-lg)",
            }}
          >
            <CardMembershipIcon
              sx={{ fontSize: 48, color: "var(--gc-primary)", mb: 2 }}
              aria-hidden
            />
            <Typography
              component="h2"
              className="gc-section-title"
              sx={{ fontSize: "1.4rem", mb: 1.5, color: "var(--gc-accent)" }}
            >
              {t("billing.noSub")}
            </Typography>
            <Typography component="p" className="gc-eyebrow" sx={{ mb: 3, maxWidth: 360 }}>
              {t("billing.noSubBody")}
            </Typography>
            <Button
              component={Link}
              href="/pricing"
              variant="contained"
              className="gc-subscription-focus"
              sx={{
                bgcolor: "var(--gc-accent)",
                color: "#fff",
                textTransform: "none",
                fontWeight: 700,
                px: 3,
                py: 1.25,
                borderRadius: "var(--gc-radius-sm)",
                "&:hover": { bgcolor: "var(--gc-accent-soft)" },
              }}
            >
              {t("cta.viewPlans")}
            </Button>
          </Box>
        </div>
      </div>
    );
  }

  return (
    <div className="gc-page-block">
      <div className="container max-w-[560px]">
        <Typography
          component="p"
          className="gc-kicker"
          sx={{ mb: 1, color: "var(--gc-text-muted)" }}
        >
          {t("billing.kicker")}
        </Typography>
        <Typography
          component="h1"
          className="gc-section-title"
          sx={{ mb: 3, fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
        >
          {t("billing.title")}
        </Typography>

        <Box
          className="gc-surface-card"
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: "var(--gc-radius-lg)",
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "var(--gc-text)",
              mb: 1.5,
            }}
          >
            {planHeading}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
            <SubscriptionStatus status={data.status} pulse={statusPulse} />
          </Box>

          {data.status === "past_due" ? (
            <Alert
              severity="warning"
              sx={{
                mb: 2,
                borderRadius: "var(--gc-radius-sm)",
                bgcolor: "#fff8e1",
                color: "#e65100",
              }}
            >
              {t("billing.paymentFailed")}
            </Alert>
          ) : null}

          {periodEnd &&
          (data.status === "active" || data.status === "trialing" || data.status === "past_due") ? (
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: "var(--gc-text-muted)",
                mb: data.cancelAtPeriodEnd ? 1 : 2,
              }}
            >
              {data.cancelAtPeriodEnd
                ? t("billing.expiresOn", { date: periodEnd })
                : t("billing.renewsOn", { date: periodEnd })}
            </Typography>
          ) : null}

          {data.cancelAtPeriodEnd && periodEnd ? (
            <Box
              className="gc-soft-panel"
              sx={{
                mt: 1,
                mb: 2,
                p: 2,
                borderRadius: "var(--gc-radius-md)",
                borderColor: "var(--gc-warning)",
                fontSize: "0.875rem",
                color: "var(--gc-text)",
              }}
            >
              {t("billing.cancelNotice", { date: periodEnd })}
            </Box>
          ) : null}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
          {data.stripeCustomerId && data.status !== "none" ? <BillingButton /> : null}
          <Link href="/pricing" className="gc-inline-link gc-subscription-focus rounded-md">
            <SwapHorizIcon sx={{ fontSize: 22 }} aria-hidden />
            {t("cta.changePlan")}
          </Link>
        </Box>
      </div>
    </div>
  );
}
