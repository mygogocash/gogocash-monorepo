"use client";

import { Box, Button, Divider, FormControlLabel, Switch, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { PDPA_CONSENT_VERSION } from "@/lib/pdpa/constants";
import type { PurposeCode } from "@/lib/pdpa/constants";
import GuardianConsentFlow from "@/components/pdpa/GuardianConsentFlow";

type EffectivePurpose = { granted: boolean; lastGrantedAt: string | null };

const OPTIONAL_PURPOSES: { code: PurposeCode; labelKey: string }[] = [
  { code: "MARKETING_COMMUNICATIONS", labelKey: "pdpaPurposeMarketing" },
  { code: "ANALYTICS_TRACKING", labelKey: "pdpaPurposeAnalytics" },
  { code: "B2B_DATA_AGGREGATION", labelKey: "pdpaPurposeB2b" },
  { code: "AI_CREDIT_SCORING", labelKey: "pdpaPurposeAi" },
];

export default function PrivacyCenterContent() {
  const t = useTranslations();
  const [effective, setEffective] = useState<Record<string, EffectivePurpose | undefined>>({});
  const [requests, setRequests] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

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
        toast.error("Could not save consent");
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
        toast.error("Could not update withdrawal");
        return;
      }
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
      <Typography variant="body2" color="text.secondary">
        …
      </Typography>
    );
  }

  return (
    <Box className="flex flex-col gap-8">
      <Typography variant="body1" color="text.secondary">
        {t("pdpaPrivacyCenterIntro")}
      </Typography>

      <section>
        <Typography variant="h6" className="mb-3 font-semibold">
          {t("pdpaSectionConsent")}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mb-2">
          {t("pdpaPurposeCashback")} — <strong>on</strong> (required for the cashback contract while
          your account is active).
        </Typography>
        {OPTIONAL_PURPOSES.map(({ code, labelKey }) => (
          <FormControlLabel
            key={code}
            control={
              <Switch
                checked={effective[code]?.granted === true}
                onChange={(_, v) => void setPurpose(code, v)}
              />
            }
            label={t(labelKey)}
          />
        ))}
      </section>

      <Divider />

      <section>
        <Typography variant="h6" className="mb-3 font-semibold">
          {t("pdpaSectionExport")}
        </Typography>
        <Button variant="contained" color="primary" onClick={() => void requestExport()}>
          {t("pdpaRequestExport")}
        </Button>
      </section>

      <Divider />

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

      <Divider />

      <section>
        <Typography variant="h6" className="mb-3 font-semibold">
          {t("pdpaSectionRights")}
        </Typography>
        <Typography variant="body2" className="mb-2">
          Recent requests: {requests.length}
        </Typography>
      </section>

      <Divider />

      <GuardianConsentFlow />
    </Box>
  );
}
