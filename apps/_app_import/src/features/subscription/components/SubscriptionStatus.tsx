"use client";

import { Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useTranslations } from "next-intl";
import type { SubscriptionStatus } from "../types";

type Props = {
  status: SubscriptionStatus;
  /** One-shot glow animation (e.g. after successful checkout). */
  pulse?: boolean;
};

const chipSx = (status: SubscriptionStatus) => {
  switch (status) {
    case "active":
      return {
        bgcolor: "var(--gc-primary-soft)",
        color: "var(--gc-accent)",
        borderColor: "transparent",
        "& .MuiChip-icon": { color: "var(--gc-primary)" },
      };
    case "trialing":
      return {
        bgcolor: "#e8f4ff",
        color: "#1565c0",
        borderColor: "transparent",
      };
    case "past_due":
      return {
        bgcolor: "#fff8e1",
        color: "#e65100",
        borderColor: "transparent",
        "& .MuiChip-icon": { color: "#e65100" },
      };
    case "canceled":
    case "incomplete":
      return {
        bgcolor: "var(--gc-surface-muted)",
        color: "var(--gc-text-muted)",
        borderColor: "var(--gc-border)",
      };
    default:
      return {
        bgcolor: "transparent",
        color: "var(--gc-text-muted)",
        borderColor: "var(--gc-border)",
      };
  }
};

export function SubscriptionStatus({ status, pulse }: Props) {
  const t = useTranslations("subscription.status");

  const label = t(status);

  const icon =
    status === "active" ? (
      <CheckCircleIcon sx={{ fontSize: "1.125rem !important" }} aria-hidden />
    ) : status === "past_due" ? (
      <WarningAmberIcon sx={{ fontSize: "1.125rem !important" }} aria-hidden />
    ) : undefined;

  return (
    <span className={pulse ? "gq-score-pulse-on inline-flex rounded-full" : "inline-flex"}>
      <Chip
        role="status"
        aria-live="polite"
        label={label}
        variant={status === "none" ? "outlined" : "filled"}
        {...(icon ? { icon } : {})}
        sx={{
          fontWeight: 600,
          ...chipSx(status),
        }}
      />
    </span>
  );
}
