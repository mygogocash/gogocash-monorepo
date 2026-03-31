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

export default function PrivacyCenterContent() {
  const t = useTranslations();
  const [effective, setEffective] = useState<Record<string, EffectivePurpose | undefined>>({});
  const [requests, setRequests] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);

  const refresh = useCallback(async () => {
    const [eRes, rRes] = await Promise.all([
      fetch("/api/pdpa/consent/effective", { credentials: "include" }),
      fetch("/api/pdpa/data-subject-requests", { credentials: "include" }),
    ]);
    if (eRes.ok) {
      const data = (await eRes.json()) as {
        purposes: Record<string, EffectivePurpose>;
      };
      setEffective(data.purposes ?? {});
    }
    if (rRes.ok) {
      const data = (await rRes.json()) as { requests: unknown[] };
      setRequests(data.requests ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const allOptionalGranted = useMemo(
    () => OPTIONAL_PURPOSES.every(({ code }) => effective[code]?.granted === true),
    [effective]
  );

  const setPurpose = async (code: PurposeCode, granted: boolean) => {
    const consentText = `${code} ${granted ? "granted" : "withdrawn"} — v${PDPA_CONSENT_VERSION}`;
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
  };

  const acceptAllOptional = async () => {
    const toGrant = OPTIONAL_PURPOSES.filter(({ code }) => effective[code]?.granted !== true);
    if (toGrant.length === 0) {
      toast.success(t("pdpaAllOptionalEnabled"));
      return;
    }
    setSavingAll(true);
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
    setSavingAll(false);
    if (!res.ok) {
      toast.error(t("pdpaConsentSaveError"));
      return;
    }
    toast.success(t("pdpaRequestSubmitted"));
    await refresh();
  };

  const requestExport = async () => {
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
  };

  const requestErasure = async () => {
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
  };

  if (loading) {
    return (
      <Box className="flex flex-col gap-10">
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
    <Box className="flex flex-col gap-10 md:gap-12">
      <section aria-labelledby="pdpa-consent-heading" className="flex flex-col gap-8 md:gap-10">
        <div>
          <h3 id="pdpa-consent-heading" className={sectionHeadingClass}>
            {t("pdpaSectionConsent")}
          </h3>
          <Typography variant="body2" className="mt-3 max-w-2xl leading-relaxed text-[#6b7280]">
            {t("pdpaMicroNotice")}
          </Typography>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#d4ede6] bg-gradient-to-br from-[#f0fdf8] via-white to-[#f8faf9] p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-8">
            <div className="min-w-0 flex-1">
              <Typography
                variant="h6"
                component="h4"
                className="mb-1 text-lg font-semibold text-[#1a1a1a]"
              >
                {t("pdpaConsentHeroTitle")}
              </Typography>
              <Typography variant="body2" className="leading-relaxed text-[#5a5a5a] md:text-[15px]">
                {t("pdpaConsentHeroBody")}
              </Typography>
            </div>
            <CheckCircleRoundedIcon
              className="hidden shrink-0 text-[#00AA80] md:block"
              sx={{ fontSize: 40 }}
              aria-hidden
            />
          </div>
          <Typography variant="caption" className="mb-4 block text-[#6b7280]">
            {t("pdpaAcceptAllOptionalHint")}
          </Typography>
          <Button
            variant="contained"
            size="large"
            disabled={savingAll || allOptionalGranted}
            onClick={() => void acceptAllOptional()}
            className="rounded-full px-6 normal-case shadow-none"
            sx={{
              bgcolor: "#00AA80",
              "&:hover": { bgcolor: "#009970" },
              "&.Mui-disabled": { bgcolor: "#b8e6d9", color: "#fff" },
            }}
            startIcon={savingAll ? <CircularProgress color="inherit" size={18} /> : undefined}
          >
            {allOptionalGranted ? t("pdpaAllOptionalEnabled") : t("pdpaAcceptAllOptional")}
          </Button>
        </div>

        <div className="rounded-2xl border border-[#e8e8e8] bg-[#fafafa] p-5 md:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <LockRoundedIcon sx={{ fontSize: 22, color: "#00AA80" }} aria-hidden />
            <Typography variant="subtitle2" component="h4" className="font-semibold text-[#1a1a1a]">
              {t("pdpaPurposeCashback")}
            </Typography>
            <span className="rounded-full bg-[#e6f7f2] px-2.5 py-0.5 text-xs font-medium text-[#007a5c]">
              {t("pdpaRequiredBadge")}
            </span>
          </div>
          <Typography variant="body2" className="leading-relaxed text-[#5a5a5a]">
            {t("pdpaCashbackRequiredDescription")}
          </Typography>
        </div>

        <div>
          <Typography
            variant="subtitle1"
            component="h4"
            className="mb-5 text-base font-semibold text-[#1a1a1a]"
          >
            {t("pdpaOptionalConsentTitle")}
          </Typography>
          <div className="flex flex-col gap-4">
            {OPTIONAL_PURPOSES.map(({ code, labelKey, descKey }) => (
              <div
                key={code}
                className="flex flex-col gap-4 rounded-2xl border border-[#e4e4e4] bg-white p-5 transition-colors hover:border-[#c5e8dc] md:flex-row md:items-center md:justify-between md:gap-6 md:p-6"
              >
                <div className="min-w-0 flex-1">
                  <Typography variant="subtitle2" className="font-semibold text-[#1a1a1a]">
                    {t(labelKey)}
                  </Typography>
                  <Typography variant="body2" className="mt-2 leading-relaxed text-[#6b7280]">
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

      <section aria-labelledby="pdpa-data-rights-heading" className="flex flex-col gap-7 md:gap-8">
        <h3 id="pdpa-data-rights-heading" className={sectionHeadingClass}>
          {t("pdpaSectionExport")} &amp; {t("pdpaSectionDelete")}
        </h3>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="flex h-full flex-col rounded-2xl border border-[#e4e4e4] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-4 flex items-center gap-3 text-[#00AA80]">
              <DownloadRoundedIcon sx={{ fontSize: 26 }} aria-hidden />
              <Typography
                variant="subtitle1"
                component="h4"
                className="font-semibold text-[#1a1a1a]"
              >
                {t("pdpaSectionExport")}
              </Typography>
            </div>
            <Typography variant="body2" className="mb-6 flex-1 leading-relaxed text-[#5a5a5a]">
              {t("pdpaExportSectionBody")}
            </Typography>
            <Button
              variant="contained"
              className="w-full rounded-full normal-case sm:w-auto"
              onClick={() => void requestExport()}
              sx={{ bgcolor: "#00AA80", "&:hover": { bgcolor: "#009970" } }}
            >
              {t("pdpaRequestExport")}
            </Button>
          </div>

          <div className="flex h-full flex-col rounded-2xl border border-[#f0e6d6] bg-[#fffaf5] p-6 shadow-sm md:p-8">
            <div className="mb-4 flex items-center gap-3 text-[#c45c00]">
              <DeleteOutlineRoundedIcon sx={{ fontSize: 26 }} aria-hidden />
              <Typography
                variant="subtitle1"
                component="h4"
                className="font-semibold text-[#1a1a1a]"
              >
                {t("pdpaSectionDelete")}
              </Typography>
            </div>
            <Typography variant="body2" className="mb-6 flex-1 leading-relaxed text-[#5a5a5a]">
              {t("pdpaDeleteSectionBody")}
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              className="w-full rounded-full border-amber-700 normal-case sm:w-auto"
              onClick={() => void requestErasure()}
            >
              {t("pdpaRequestDeleteButton")}
            </Button>
            <Typography
              variant="caption"
              display="block"
              className="mt-4 leading-relaxed text-[#6b7280]"
            >
              {t("pdpaDeleteRetentionNote")}
            </Typography>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="pdpa-requests-heading"
        className="rounded-2xl border border-[#e8e8e8] bg-[#fafafa] p-6 md:p-8"
      >
        <h3 id="pdpa-requests-heading" className={sectionHeadingClass}>
          {t("pdpaRequestsSectionTitle")}
        </h3>
        <Typography variant="body2" className="mt-3 max-w-2xl leading-relaxed text-[#6b7280]">
          {t("pdpaRequestsSectionBody")}
        </Typography>
        <Typography variant="body1" className="mt-5 font-medium text-[#3b3b3b]">
          {t("pdpaRequestsCount", { count: requests.length })}
        </Typography>
      </section>

      <GuardianConsentFlow />
    </Box>
  );
}
