"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Link as MuiLink,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { useState } from "react";
import { PLANS } from "../constants";
import { PricingCard } from "./PricingCard";
import { PricingToggle, type BillingPeriod } from "./PricingToggle";

export default function PricingPageClient() {
  const t = useTranslations("subscription");
  const [period, setPeriod] = useState<BillingPeriod>("annual");

  const monthlyYearTotal = (PLANS.starter_monthly.priceUsd * 12).toFixed(2);
  const annualPrice = PLANS.starter_annual.priceUsd.toFixed(2);
  const saveAmount = (PLANS.starter_monthly.priceUsd * 12 - PLANS.starter_annual.priceUsd).toFixed(
    2
  );
  const savePct = String(PLANS.starter_annual.savingsPct);

  if (!FEATURE_FLAGS.stripeBilling) {
    return (
      <div className="gc-page-block">
        <div className="container">
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
            <MuiLink component={Link} href="/membership" className="gc-inline-link">
              {t("stripeDisabledCta")}
            </MuiLink>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="gc-page-block">
      <div className="container">
        <Box
          sx={{
            textAlign: "center",
            maxWidth: 600,
            mx: "auto",
            mb: { xs: 3, md: 4 },
          }}
        >
          <Typography component="p" className="gc-kicker" sx={{ mb: 1.5 }}>
            {t("page.kicker")}
          </Typography>
          <Typography component="h1" className="gc-section-title" sx={{ mb: 1.5 }}>
            {t("page.title")}
          </Typography>
          <Typography component="p" className="gc-eyebrow">
            {t("page.subtitle")}
          </Typography>
        </Box>

        <PricingToggle value={period} onChange={setPeriod} />

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            alignItems: "stretch",
            mb: 3,
          }}
        >
          <Box sx={{ order: { xs: 2, md: 1 } }}>
            <PricingCard planId="starter_monthly" emphasized={period === "monthly"} />
          </Box>
          <Box sx={{ order: { xs: 1, md: 2 } }}>
            <PricingCard planId="starter_annual" emphasized={period === "annual"} />
          </Box>
        </Box>

        <Box
          className="gc-soft-panel"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            mb: 4,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--gc-text)",
            }}
          >
            <span>{t("comparison.monthlyTotal", { amount: `$${monthlyYearTotal}` })}</span>
            <span aria-hidden="true" style={{ color: "var(--gc-primary)" }}>
              {t("comparison.arrowDown")}
            </span>
            <span>{t("comparison.annualTotal", { amount: `$${annualPrice}` })}</span>
            <Typography
              component="span"
              sx={{ color: "var(--gc-primary-strong)", fontWeight: 700 }}
            >
              {t("comparison.save", { amount: `$${saveAmount}`, pct: savePct })}
            </Typography>
          </Box>
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 1.5,
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--gc-text)",
            }}
          >
            <span>{t("comparison.monthlyTotal", { amount: `$${monthlyYearTotal}` })}</span>
            <span aria-hidden="true" style={{ color: "var(--gc-primary)" }}>
              {t("comparison.arrow")}
            </span>
            <span>{t("comparison.annualTotal", { amount: `$${annualPrice}` })}</span>
            <span aria-hidden="true" style={{ color: "var(--gc-primary)" }}>
              {t("comparison.arrow")}
            </span>
            <Typography
              component="span"
              sx={{ color: "var(--gc-primary-strong)", fontWeight: 700 }}
            >
              {t("comparison.save", { amount: `$${saveAmount}`, pct: savePct })}
            </Typography>
          </Box>
        </Box>

        <Box
          className="gc-soft-panel"
          sx={{
            borderRadius: "var(--gc-radius-lg)",
            overflow: "hidden",
            mx: { xs: 0, md: "auto" },
            maxWidth: { md: "80%", lg: "70%" },
          }}
        >
          <Typography
            variant="h6"
            sx={{
              px: 2,
              pt: 2,
              pb: 1,
              fontWeight: 700,
              color: "var(--gc-accent)",
            }}
          >
            {t("faq.title")}
          </Typography>
          {(["1", "2", "3", "4"] as const).map((n) => (
            <Accordion
              key={n}
              disableGutters
              elevation={0}
              sx={{
                bgcolor: "var(--gc-surface)",
                "&:before": { display: "none" },
                borderBottom: "1px solid var(--gc-border)",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: "var(--gc-primary)" }} aria-hidden />}
                sx={{
                  fontWeight: 600,
                  color: "var(--gc-text)",
                  px: 2,
                  "&:focus-visible": { outline: "2px solid var(--gc-primary)", outlineOffset: 2 },
                }}
              >
                {t(`faq.q${n}`)}
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  bgcolor: "var(--gc-surface-muted)",
                  color: "var(--gc-text-muted)",
                  fontSize: "0.9rem",
                  px: 2,
                  py: 1.5,
                }}
              >
                {t(`faq.a${n}`)}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </div>
    </div>
  );
}
