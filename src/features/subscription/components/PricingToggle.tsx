"use client";

import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTranslations } from "next-intl";

export type BillingPeriod = "monthly" | "annual";

type Props = {
  value: BillingPeriod;
  onChange: (next: BillingPeriod) => void;
};

export function PricingToggle({ value, onChange }: Props) {
  const t = useTranslations("subscription.toggle");

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
      <ToggleButtonGroup
        exclusive
        value={value}
        onChange={(_, v) => {
          if (v != null) onChange(v);
        }}
        aria-label={t("aria")}
        sx={{
          gap: 0,
          p: 0.5,
          borderRadius: "var(--gc-radius-sm)",
          border: "1px solid var(--gc-border)",
          bgcolor: "var(--gc-surface-muted)",
          "& .MuiToggleButtonGroup-grouped": {
            mx: 0.25,
            borderRadius: "var(--gc-radius-sm) !important",
            px: 2.5,
            py: 1,
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.9375rem",
            transition: "all 180ms ease",
            color: "var(--gc-text-muted)",
            bgcolor: "var(--gc-surface)",
            border: "1px solid var(--gc-border) !important",
            "&:focus-visible": {
              outline: "2px solid var(--gc-primary)",
              outlineOffset: 2,
            },
            "&.Mui-selected": {
              bgcolor: "var(--gc-primary) !important",
              color: "#fff !important",
              borderColor: "var(--gc-primary) !important",
            },
            "&.Mui-selected:hover": {
              bgcolor: "var(--gc-primary-strong) !important",
            },
          },
        }}
      >
        <ToggleButton value="monthly" aria-pressed={value === "monthly"} disableRipple>
          {t("monthly")}
        </ToggleButton>
        <ToggleButton
          value="annual"
          aria-pressed={value === "annual"}
          disableRipple
          sx={{ position: "relative" }}
        >
          <Box component="span" sx={{ pr: { xs: 0, sm: 5 } }}>
            {t("annual")}
          </Box>
          <Box
            component="span"
            className="gc-pill"
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              py: 0.25,
              px: 1,
              fontSize: "0.65rem",
              bgcolor: "var(--gc-primary-soft)",
              color: "var(--gc-accent)",
              borderColor: "var(--gc-primary)",
            }}
          >
            {t("saveBadge")}
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
