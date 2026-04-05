"use client";

import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Skeleton,
  Switch,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { PDPA_CONSENT_VERSION } from "@/lib/pdpa/constants";
import type { PurposeCode } from "@/lib/pdpa/constants";
import GuardianConsentFlow from "@/components/pdpa/GuardianConsentFlow";

type EffectivePurpose = { granted: boolean; lastGrantedAt: string | null };

const OPTIONAL_PURPOSES: { code: PurposeCode; labelKey: string; descKey: string }[] = [
  {
    code: "MARKETING_COMMUNICATIONS",
    labelKey: "pdpaPurposeMarketing",
    descKey: "pdpaPurposeMarketingDesc",
  },
  {
    code: "ANALYTICS_TRACKING",
    labelKey: "pdpaPurposeAnalytics",
    descKey: "pdpaPurposeAnalyticsDesc",
  },
  { code: "B2B_DATA_AGGREGATION", labelKey: "pdpaPurposeB2b", descKey: "pdpaPurposeB2bDesc" },
  { code: "AI_CREDIT_SCORING", labelKey: "pdpaPurposeAi", descKey: "pdpaPurposeAiDesc" },
];

const sectionHeadingClass = "text-lg font-semibold tracking-tight text-[#1a1a1a] md:text-xl";

/** Shared card padding: compact on mobile, roomier from `sm` / `md` up. */
const cardPad = "p-4 sm:p-5 md:p-8";
const cardPadCompact = "p-4 sm:p-5 md:p-6";

/** Centered footnotes under primary actions (export / delete cards). */
const cardActionFootnoteClass =
  "mt-3 max-md:leading-snug text-center text-[#6b7280] md:mt-4 md:leading-relaxed";

const primaryGreenButtonSx = {
  bgcolor: "#00AA80",
  "&:hover": { bgcolor: "#009970" },
} as const;

export default function PrivacyCenterContent() {
  const t = useTranslations();
  const [effective, setEffective] = useState<Record<string, EffectivePurpose | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const eRes = await fetch("/api/pdpa/consent/effective", { credentials: "include" });
      if (eRes.ok) {
        const data = (await eRes.json()) as {
          purposes: Record<string, EffectivePurpose>;
        };
        setEffective(data.purposes ?? {});
      }
    } catch {
      toast.error(t("pdpaRequestFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allOptionalGranted = useMemo(
    () => OPTIONAL_PURPOSES.every(({ code }) => effective[code]?.granted === true),
    [effective]
  );

  const setPurpose = async (code: PurposeCode, granted: boolean) => {
    const consentText = `${code} ${granted ? "granted" : "withdrawn"} — v${PDPA_CONSENT_VERSION}`;
    try {
      if (granted) {
        const res = await fetch("/api/pdpa/consent", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purposes: [{ purposeCode: code, granted: true, consentText }],
            method: "SETTINGS_UPDATE",
          }),
        });
        if (!res.ok) {
          toast.error(t("pdpaConsentSaveError"));
          return;
        }
      } else {
        const res = await fetch("/api/pdpa/consent/withdraw", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purposeCodes: [code],
            method: "SETTINGS_UPDATE",
          }),
        });
        if (!res.ok) {
          toast.error(t("pdpaConsentSaveError"));
          return;
        }
      }
      toast.success(t("pdpaRequestSubmitted"));
      await refresh();
    } catch {
      toast.error(t("pdpaConsentSaveError"));
    }
  };

  const acceptAllOptional = async () => {
    const toGrant = OPTIONAL_PURPOSES.filter(({ code }) => effective[code]?.granted !== true);
    if (toGrant.length === 0) {
      toast.success(t("pdpaAllOptionalEnabled"));
      return;
    }
    setSavingAll(true);
    try {
      const purposes = toGrant.map(({ code }) => ({
        purposeCode: code,
        granted: true as const,
        consentText: `${code} granted — v${PDPA_CONSENT_VERSION}`,
      }));
      const res = await fetch("/api/pdpa/consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purposes, method: "SETTINGS_UPDATE" }),
      });
      if (!res.ok) {
        toast.error(t("pdpaConsentSaveError"));
        return;
      }
      toast.success(t("pdpaRequestSubmitted"));
      await refresh();
    } catch {
      toast.error(t("pdpaRequestFailed"));
    } finally {
      setSavingAll(false);
    }
  };

  const requestExport = async () => {
    try {
      const res = await fetch("/api/pdpa/data-subject-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PORTABILITY", channel: "IN_APP" }),
      });
      if (!res.ok) {
        toast.error(t("pdpaRequestFailed"));
        return;
      }
      toast.success(t("pdpaRequestSubmitted"));
      await refresh();
    } catch {
      toast.error(t("pdpaRequestFailed"));
    }
  };

  const requestErasure = async () => {
    try {
      const res = await fetch("/api/pdpa/data-subject-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "ERASURE", channel: "IN_APP" }),
      });
      if (!res.ok) {
        toast.error(t("pdpaRequestFailed"));
        return;
      }
      toast.success(t("pdpaRequestSubmitted"));
      await refresh();
    } catch {
      toast.error(t("pdpaRequestFailed"));
    }
  };

  if (loading) {
    return (
      <Box className="flex flex-col gap-6">
        <Skeleton variant="rounded" height={120} className="rounded-2xl" />
        <Skeleton variant="rounded" height={100} className="rounded-2xl" />
        <Skeleton variant="text" width="55%" />
        <Skeleton variant="rounded" height={160} className="rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton variant="rounded" height={140} className="rounded-2xl" />
          <Skeleton variant="rounded" height={140} className="rounded-2xl" />
        </div>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-6 md:gap-12">
      <section aria-labelledby="pdpa-consent-heading" className="flex flex-col gap-6 md:gap-10">
        <div>
          <h3 id="pdpa-consent-heading" className={sectionHeadingClass}>
            {t("pdpaSectionConsent")}
          </h3>
          <Typography variant="body2" className="mt-3 max-w-2xl leading-relaxed text-[#6b7280]">
            {t("pdpaMicroNotice")}
          </Typography>
        </div>

        <div
          className={`overflow-hidden rounded-2xl border border-[#d4ede6] bg-gradient-to-br from-[#f0fdf8] via-white to-[#f8faf9] shadow-sm ${cardPad}`}
        >
          <div className="mb-3 flex flex-col gap-2 sm:gap-3 md:mb-5 md:flex-row md:items-start md:justify-between md:gap-8">
            <div className="min-w-0 flex-1">
              <Typography
                variant="h6"
                component="h4"
                className="mb-1 text-base font-semibold text-[#1a1a1a] md:text-lg"
              >
                {t("pdpaConsentHeroTitle")}
              </Typography>
              <Typography
                variant="body2"
                className="text-[14px] leading-relaxed text-[#5a5a5a] md:text-[15px]"
              >
                {t("pdpaConsentHeroBody")}
              </Typography>
            </div>
            <CheckCircleRoundedIcon
              className="shrink-0 text-[#00AA80]"
              sx={{ fontSize: 40, display: { xs: "none", md: "block" } }}
              aria-hidden
            />
          </div>
          <Button
            variant="contained"
            size="large"
            disabled={savingAll || allOptionalGranted}
            aria-busy={savingAll}
            aria-describedby="pdpa-accept-all-hint"
            onClick={() => void acceptAllOptional()}
            className="mb-3 w-full max-md:min-h-11 max-md:py-2 max-md:text-[0.9375rem] rounded-full px-5 normal-case shadow-none md:mb-4 md:px-6"
            sx={{
              ...primaryGreenButtonSx,
              "&.Mui-disabled": { bgcolor: "#b8e6d9", color: "#fff" },
            }}
            startIcon={savingAll ? <CircularProgress color="inherit" size={18} /> : undefined}
          >
            {allOptionalGranted ? t("pdpaAllOptionalEnabled") : t("pdpaAcceptAllOptional")}
          </Button>
          <Typography
            id="pdpa-accept-all-hint"
            variant="caption"
            component="p"
            className="m-0 text-[#6b7280] max-md:leading-snug"
          >
            {t("pdpaAcceptAllOptionalHint")}
          </Typography>
        </div>

        <div className={`rounded-2xl border border-[#e8e8e8] bg-[#fafafa] ${cardPadCompact}`}>
          <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-3">
            <LockRoundedIcon sx={{ fontSize: 22, color: "#00AA80" }} aria-hidden />
            <Typography variant="subtitle2" component="h4" className="font-semibold text-[#1a1a1a]">
              {t("pdpaPurposeCashback")}
            </Typography>
            <span className="rounded-full bg-[#e6f7f2] px-2.5 py-0.5 text-xs font-medium text-[#007a5c]">
              {t("pdpaRequiredBadge")}
            </span>
          </div>
          <Typography
            variant="body2"
            className="text-[14px] leading-relaxed text-[#5a5a5a] md:text-[0.875rem]"
          >
            {t("pdpaCashbackRequiredDescription")}
          </Typography>
        </div>

        <div>
          <Typography
            variant="subtitle1"
            component="h4"
            className="mb-4 text-base font-semibold text-[#1a1a1a] md:mb-5"
          >
            {t("pdpaOptionalConsentTitle")}
          </Typography>
          <div className="flex flex-col gap-3 md:gap-4">
            {OPTIONAL_PURPOSES.map(({ code, labelKey, descKey }) => (
              <div
                key={code}
                className="flex flex-col gap-3 rounded-2xl border border-[#e4e4e4] bg-white p-4 transition-colors hover:border-[#c5e8dc] sm:p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:p-6"
              >
                <div className="min-w-0 flex-1">
                  <Typography variant="subtitle2" className="font-semibold text-[#1a1a1a]">
                    {t(labelKey)}
                  </Typography>
                  <Typography
                    variant="body2"
                    className="mt-1.5 text-[14px] leading-relaxed text-[#6b7280] md:mt-2 md:text-[0.875rem]"
                  >
                    {t(descKey)}
                  </Typography>
                </div>
                <FormControlLabel
                  className="m-0 shrink-0 md:pl-2"
                  control={
                    <Switch
                      color="success"
                      checked={effective[code]?.granted === true}
                      onChange={(_, v) => void setPurpose(code, v)}
                      inputProps={{ "aria-label": t(labelKey) }}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#00AA80" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "#00AA80",
                        },
                      }}
                    />
                  }
                  label={
                    <span className="text-sm font-medium text-[#5a5a5a]">
                      {effective[code]?.granted === true ? t("pdpaConsentOn") : t("pdpaConsentOff")}
                    </span>
                  }
                  labelPlacement="start"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="pdpa-data-rights-heading" className="flex flex-col gap-6 md:gap-8">
        <h3 id="pdpa-data-rights-heading" className={sectionHeadingClass}>
          {t("pdpaSectionExport")} &amp; {t("pdpaSectionDelete")}
        </h3>
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2 lg:gap-8">
          <div
            className={`flex h-full flex-col rounded-2xl border border-[#e4e4e4] bg-white shadow-sm ${cardPad}`}
          >
            <div className="mb-3 flex items-center gap-2.5 text-[#00AA80] md:mb-4 md:gap-3">
              <DownloadRoundedIcon sx={{ fontSize: { xs: 24, md: 26 } }} aria-hidden />
              <Typography
                variant="subtitle1"
                component="h4"
                className="text-[15px] font-semibold text-[#1a1a1a] md:text-base"
              >
                {t("pdpaSectionExport")}
              </Typography>
            </div>
            <Typography
              variant="body2"
              className="mb-4 flex-1 text-[14px] leading-relaxed text-[#5a5a5a] md:mb-6 md:text-[0.875rem]"
            >
              {t("pdpaExportSectionBody")}
            </Typography>
            <Button
              variant="contained"
              className="max-md:min-h-11 max-md:py-2 max-md:text-[0.9375rem] w-full rounded-full normal-case sm:w-auto"
              aria-describedby="pdpa-export-email-note"
              onClick={() => void requestExport()}
              sx={primaryGreenButtonSx}
            >
              {t("pdpaRequestExport")}
            </Button>
            <Typography
              id="pdpa-export-email-note"
              variant="caption"
              component="p"
              className={`m-0 ${cardActionFootnoteClass}`}
            >
              {t("pdpaExportEmailNote")}
            </Typography>
          </div>

          <div
            className={`flex h-full flex-col rounded-2xl border border-[#f0e6d6] bg-[#fffaf5] shadow-sm ${cardPad}`}
          >
            <div className="mb-3 flex items-center gap-2.5 text-[#c45c00] md:mb-4 md:gap-3">
              <DeleteOutlineRoundedIcon sx={{ fontSize: { xs: 24, md: 26 } }} aria-hidden />
              <Typography
                variant="subtitle1"
                component="h4"
                className="text-[15px] font-semibold text-[#1a1a1a] md:text-base"
              >
                {t("pdpaSectionDelete")}
              </Typography>
            </div>
            <Typography
              variant="body2"
              className="mb-4 flex-1 text-[14px] leading-relaxed text-[#5a5a5a] md:mb-6 md:text-[0.875rem]"
            >
              {t("pdpaDeleteSectionBody")}
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              className="max-md:min-h-11 max-md:py-2 max-md:text-[0.9375rem] w-full rounded-full border-amber-700 normal-case sm:w-auto"
              aria-describedby="pdpa-delete-retention-note"
              onClick={() => void requestErasure()}
            >
              {t("pdpaRequestDeleteButton")}
            </Button>
            <Typography
              id="pdpa-delete-retention-note"
              variant="caption"
              component="p"
              className={`m-0 ${cardActionFootnoteClass}`}
            >
              {t("pdpaDeleteRetentionNote")}
            </Typography>
          </div>
        </div>
      </section>

      <GuardianConsentFlow />
    </Box>
  );
}
