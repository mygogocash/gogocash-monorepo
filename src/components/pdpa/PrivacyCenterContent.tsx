"use client";

import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Skeleton,
  Switch,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { PDPA_CONSENT_VERSION } from "@/lib/pdpa/constants";
import type { PurposeCode } from "@/lib/pdpa/constants";
import GuardianConsentFlow from "@/components/pdpa/GuardianConsentFlow";

type EffectivePurpose = { granted: boolean; lastGrantedAt: string | null };

const OPTIONAL_PURPOSES: { code: PurposeCode; labelKey: string; descKey: string }[] = [
  { code: "MARKETING_COMMUNICATIONS", labelKey: "pdpaPurposeMarketing", descKey: "pdpaPurposeMarketingDesc" },
  { code: "ANALYTICS_TRACKING", labelKey: "pdpaPurposeAnalytics", descKey: "pdpaPurposeAnalyticsDesc" },
  { code: "B2B_DATA_AGGREGATION", labelKey: "pdpaPurposeB2b", descKey: "pdpaPurposeB2bDesc" },
  { code: "AI_CREDIT_SCORING", labelKey: "pdpaPurposeAi", descKey: "pdpaPurposeAiDesc" },
];

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
      toast.error("Request failed");
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
      toast.error("Request failed");
      return;
    }
    toast.success(t("pdpaRequestSubmitted"));
    await refresh();
  };

  if (loading) {
    return (
      <Box className="flex flex-col gap-6">
        <Skeleton variant="rounded" height={140} className="rounded-2xl" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="rounded" height={88} className="rounded-2xl" />
        <Skeleton variant="rounded" height={88} className="rounded-2xl" />
        <Skeleton variant="rounded" height={88} className="rounded-2xl" />
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-8">
      <Typography variant="body1" className="text-[#3b3b3b]">
        {t("pdpaPrivacyCenterIntro")}
      </Typography>

      <section className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-2xl border border-[#d4ede6] bg-gradient-to-br from-[#f0fdf8] via-white to-[#f8faf9] p-5 shadow-sm md:p-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="min-w-0 flex-1">
              <Typography variant="h6" className="mb-1 font-semibold text-[#1a1a1a]">
                {t("pdpaConsentHeroTitle")}
              </Typography>
              <Typography variant="body2" className="text-[#5a5a5a]">
                {t("pdpaConsentHeroBody")}
              </Typography>
            </div>
            <CheckCircleRoundedIcon className="hidden shrink-0 text-[#00AA80] md:block" sx={{ fontSize: 40 }} />
          </div>
          <Typography variant="caption" className="mb-3 block text-[#6b7280]">
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
            startIcon={
              savingAll ? <CircularProgress color="inherit" size={18} /> : undefined
            }
          >
            {allOptionalGranted ? t("pdpaAllOptionalEnabled") : t("pdpaAcceptAllOptional")}
          </Button>
        </div>

        <div className="rounded-2xl border border-[#e8e8e8] bg-[#fafafa] p-4 md:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <LockRoundedIcon sx={{ fontSize: 20, color: "#00AA80" }} />
            <Typography variant="subtitle2" className="font-semibold text-[#1a1a1a]">
              {t("pdpaPurposeCashback")}
            </Typography>
            <span className="rounded-full bg-[#e6f7f2] px-2.5 py-0.5 text-xs font-medium text-[#007a5c]">
              {t("pdpaRequiredBadge")}
            </span>
          </div>
          <Typography variant="body2" className="text-[#5a5a5a]">
            {t("pdpaCashbackRequiredDescription")}
          </Typography>
        </div>

        <div>
          <Typography variant="subtitle1" className="mb-3 font-semibold text-[#1a1a1a]">
            {t("pdpaOptionalConsentTitle")}
          </Typography>
          <div className="flex flex-col gap-3">
            {OPTIONAL_PURPOSES.map(({ code, labelKey, descKey }) => (
              <div
                key={code}
                className="flex flex-col gap-2 rounded-2xl border border-[#e4e4e4] bg-white p-4 transition-colors hover:border-[#c5e8dc] md:flex-row md:items-center md:justify-between md:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <Typography variant="subtitle2" className="font-semibold text-[#1a1a1a]">
                    {t(labelKey)}
                  </Typography>
                  <Typography variant="body2" className="mt-0.5 text-[#6b7280]">
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
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#00AA80" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "#00AA80",
                        },
                      }}
                    />
                  }
                  label={
                    <span className="text-sm text-[#5a5a5a]">
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

      <Divider className="border-[#e8e8e8]" />

      <section>
        <Typography variant="h6" className="mb-3 font-semibold">
          {t("pdpaSectionExport")}
        </Typography>
        <Button variant="contained" color="primary" onClick={() => void requestExport()}>
          {t("pdpaRequestExport")}
        </Button>
      </section>

      <Divider className="border-[#e8e8e8]" />

      <section>
        <Typography variant="h6" className="mb-3 font-semibold">
          {t("pdpaSectionDelete")}
        </Typography>
        <Button variant="outlined" color="warning" onClick={() => void requestErasure()}>
          Request account deletion (มาตรา 33)
        </Button>
        <Typography variant="caption" display="block" className="mt-2 text-gray-600">
          Some records may be anonymized instead of deleted where the law requires retention.
        </Typography>
      </section>

      <Divider className="border-[#e8e8e8]" />

      <section>
        <Typography variant="h6" className="mb-3 font-semibold">
          {t("pdpaSectionRights")}
        </Typography>
        <Typography variant="body2" className="mb-2">
          Recent requests: {requests.length}
        </Typography>
      </section>

      <Divider className="border-[#e8e8e8]" />

      <GuardianConsentFlow />
    </Box>
  );
}
