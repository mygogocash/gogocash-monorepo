"use client";

import { Button, CircularProgress } from "@mui/material";
import { useTranslations } from "next-intl";
import { useBillingPortal } from "../hooks/useBillingPortal";

export function BillingButton() {
  const t = useTranslations("subscription.cta");
  const { mutate, isPending } = useBillingPortal();

  return (
    <Button
      variant="outlined"
      disabled={isPending}
      onClick={() => mutate()}
      className="gc-subscription-focus"
      sx={{
        textTransform: "none",
        fontWeight: 700,
        py: 1.25,
        borderRadius: "var(--gc-radius-sm)",
        borderWidth: 2,
        borderColor: "var(--gc-primary-strong)",
        color: "var(--gc-accent)",
        "&:hover": {
          borderWidth: 2,
          borderColor: "var(--gc-primary-strong)",
          bgcolor: "var(--gc-primary-soft)",
        },
      }}
    >
      {isPending ? (
        <CircularProgress size={16} sx={{ color: "var(--gc-primary)" }} aria-hidden />
      ) : (
        t("manageSubscription")
      )}
    </Button>
  );
}
