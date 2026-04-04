"use client";

import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useTranslations } from "next-intl";
import { useCheckout } from "../hooks/useCheckout";
import type { PlanId } from "../types";
import { useSubscription } from "../hooks/useSubscription";

type Props = {
  planId: PlanId;
  /** Matches the billing-period toggle so the selected plan reads visually stronger. */
  emphasized: boolean;
};

export function PricingCard({ planId, emphasized }: Props) {
  const t = useTranslations("subscription");
  const isAnnual = planId === "starter_annual";
  const { mutate, isPending, variables: pendingPlan } = useCheckout();
  const { data: sub } = useSubscription();

  const isCurrentPlan = Boolean(
    sub?.planId === planId && (sub.status === "active" || sub.status === "trialing")
  );
  const hasActiveSubscription = Boolean(
    sub && (sub.status === "active" || sub.status === "trialing") && sub.planId
  );

  const disabled = isPending || hasActiveSubscription;
  const showSpinner = isPending && pendingPlan === planId;

  const ctaLabel = isCurrentPlan
    ? t("cta.currentPlan")
    : isAnnual
      ? t("cta.subscribeAnnual")
      : t("cta.subscribeMonthly");

  const ariaLabel = isAnnual ? t("cta.ariaAnnual") : t("cta.ariaMonthly");

  const benefitKeys = ["care", "warranty", "vouchers"] as const;

  const cardClass = isAnnual ? "" : "gc-surface-card";

  return (
    <Box
      className={cardClass}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        opacity: emphasized ? 1 : 0.9,
        transition: "opacity 180ms ease",
        p: { xs: 2.25, md: 2.75 },
        borderRadius: "var(--gc-radius-lg)",
        border: isAnnual ? "2px solid var(--gc-primary)" : "1px solid var(--gc-border)",
        bgcolor: isAnnual ? "var(--gc-primary-soft)" : "rgba(255, 255, 255, 0.9)",
        boxShadow: isAnnual
          ? "var(--gc-shadow-soft), 0 0 0 4px rgba(0, 204, 153, 0.12)"
          : "var(--gc-shadow-soft)",
        backdropFilter: isAnnual ? "none" : "blur(14px)",
      }}
    >
      {isAnnual ? (
        <Box
          className="gc-pill"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            bgcolor: "var(--gc-surface)",
            color: "var(--gc-accent)",
            borderColor: "var(--gc-primary)",
            fontSize: "0.7rem",
            py: 0.35,
            px: 1.1,
          }}
        >
          {t("plan.annual.bestValue")}
        </Box>
      ) : null}

      <Typography component="p" className="gc-kicker" sx={{ mb: 1.5, mt: isAnnual ? 3 : 0 }}>
        {isAnnual ? t("plan.annual.name") : t("plan.monthly.name")}
      </Typography>

      <Box sx={{ mb: 1.5 }}>
        <Typography
          component="p"
          sx={{
            fontSize: "clamp(2.4rem, 5vw, 3rem)",
            fontWeight: 800,
            color: "var(--gc-accent)",
            lineHeight: 1.05,
          }}
        >
          {isAnnual ? t("plan.annual.price") : t("plan.monthly.price")}
          <Typography
            component="span"
            className="gc-eyebrow"
            sx={{ fontSize: "1rem", fontWeight: 500, color: "var(--gc-text-soft)", ml: 0.5 }}
          >
            {isAnnual ? t("plan.annual.period") : t("plan.monthly.period")}
          </Typography>
        </Typography>
        {isAnnual ? (
          <Typography
            sx={{
              mt: 0.5,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--gc-accent-soft)",
            }}
          >
            {t("plan.annual.effectiveMonthly")}
          </Typography>
        ) : null}
        <Typography
          sx={{
            mt: 0.75,
            fontSize: "0.75rem",
            color: "var(--gc-text-soft)",
          }}
        >
          {isAnnual ? t("plan.annual.thbRef") : t("plan.monthly.thbRef")}
        </Typography>
        <Typography
          component="p"
          sx={{
            mt: 0.5,
            fontSize: "0.7rem",
            fontStyle: "italic",
            color: "var(--gc-text-soft)",
          }}
        >
          {t("thbDisclaimer")}
        </Typography>
      </Box>

      <List dense disablePadding sx={{ flex: 1, mb: 2 }}>
        {benefitKeys.map((key) => (
          <ListItem key={key} disableGutters sx={{ py: 0.65, alignItems: "flex-start" }}>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.15 }}>
              <CheckCircleOutlineIcon
                sx={{ color: "var(--gc-primary)", fontSize: 22 }}
                aria-hidden
              />
            </ListItemIcon>
            <ListItemText
              primary={t(`benefits.${key}`)}
              slotProps={{
                primary: {
                  sx: { fontSize: "0.9rem", color: "var(--gc-text)", fontWeight: 500 },
                },
              }}
            />
          </ListItem>
        ))}
        {isAnnual ? (
          <ListItem disableGutters sx={{ py: 0.65, alignItems: "flex-start" }}>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.15 }}>
              <LocalOfferIcon
                sx={{ color: "var(--gc-primary-strong)", fontSize: 22 }}
                aria-hidden
              />
            </ListItemIcon>
            <ListItemText
              primary={t("plan.annual.savingsLine")}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: "0.9rem",
                    color: "var(--gc-primary-strong)",
                    fontWeight: 700,
                  },
                },
              }}
            />
          </ListItem>
        ) : null}
      </List>

      <Button
        fullWidth
        variant={isAnnual ? "contained" : "outlined"}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => mutate(planId)}
        className="gc-subscription-focus"
        sx={{
          mt: "auto",
          py: 1.5,
          borderRadius: "var(--gc-radius-sm)",
          textTransform: "none",
          fontWeight: 700,
          ...(isAnnual
            ? {
                bgcolor: "var(--gc-accent)",
                color: "#fff",
                boxShadow: "none",
                "&:hover": { bgcolor: "var(--gc-accent-soft)" },
                "&.Mui-disabled": { color: "rgba(255,255,255,0.65)" },
              }
            : {
                borderWidth: 2,
                borderColor: "var(--gc-primary-strong)",
                color: "var(--gc-accent)",
                bgcolor: "transparent",
                "&:hover": {
                  borderColor: "var(--gc-primary-strong)",
                  bgcolor: "var(--gc-primary)",
                  color: "#fff",
                },
                "&.Mui-disabled": {
                  borderColor: "var(--gc-border)",
                  color: "var(--gc-text-muted)",
                },
              }),
        }}
      >
        {showSpinner ? <CircularProgress size={20} color="inherit" aria-hidden /> : ctaLabel}
      </Button>
    </Box>
  );
}
