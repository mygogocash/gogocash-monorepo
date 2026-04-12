"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Button, TextField, Typography } from "@mui/material";
import { ShieldCheck } from "lucide-react";

/**
 * PDPA-related age / eligibility verification (formerly framed as guardian consent).
 * Backend route unchanged: `POST /api/pdpa/guardian/verify`.
 */
export default function AgeVerificationFlow() {
  const t = useTranslations();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const code = token.trim();
    if (!code) {
      toast.error(t("pdpaAgeVerifyIncompleteCode"));
      return;
    }
    if (code.length < 10) {
      toast.error(t("pdpaAgeVerifyIncompleteCode"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/pdpa/guardian/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      if (!res.ok) {
        toast.error(t("pdpaAgeVerifyError"));
        return;
      }
      toast.success(t("pdpaAgeVerifySuccess"));
      setToken("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-(--gc-border) bg-gradient-to-b from-[#f6fbf9] to-white p-5 shadow-sm md:p-6"
      aria-label={t("pdpaAgeVerifyTitle")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--gc-primary-soft) text-(--gc-primary-strong)"
          aria-hidden
        >
          <ShieldCheck className="h-6 w-6" strokeWidth={2} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/*
            SubPage already exposes an h1 with the same copy; keep a visual title here without a second heading level.
          */}
          <Typography
            variant="subtitle1"
            component="div"
            className="font-semibold text-[var(--gc-text)]"
            sx={{ fontWeight: 600 }}
          >
            {t("pdpaAgeVerifyTitle")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            className="max-w-prose leading-relaxed"
          >
            {t("pdpaAgeVerifyBody")}
          </Typography>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-stretch">
            <TextField
              size="small"
              label={t("pdpaAgeVerifyPlaceholder")}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) {
                  e.preventDefault();
                  void submit();
                }
              }}
              fullWidth
              className="sm:flex-1"
              inputProps={{
                autoComplete: "one-time-code",
                "aria-describedby": "pdpa-age-verify-hint",
              }}
            />
            <Button
              type="button"
              variant="contained"
              disabled={busy}
              onClick={() => void submit()}
              className="relative z-[1] h-10 shrink-0 rounded-full px-8 normal-case sm:h-auto sm:min-h-10"
              sx={{
                bgcolor: "var(--gc-primary-strong)",
                color: "#fff",
                "&:hover": { bgcolor: "var(--gc-primary-strong)", filter: "brightness(0.92)" },
                "&.Mui-disabled": { color: "rgba(255,255,255,0.7)" },
              }}
            >
              {t("pdpaAgeVerifySubmit")}
            </Button>
          </div>
          <Typography
            id="pdpa-age-verify-hint"
            variant="caption"
            color="text.secondary"
            component="p"
            className="m-0"
          >
            {t("pdpaAgeVerifyHint")}
          </Typography>
        </div>
      </div>
    </section>
  );
}
