"use client";

import { Box, Button, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

export default function GuardianConsentFlow() {
  const t = useTranslations();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/pdpa/guardian/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      if (!res.ok) {
        toast.error("Verification failed");
        return;
      }
      toast.success("Verified");
      setToken("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box className="flex flex-col gap-3 rounded-xl border border-dashed border-[#ccc] p-4">
      <Typography variant="subtitle1" fontWeight={600}>
        {t("pdpaGuardianTitle")}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t("pdpaGuardianBody")}
      </Typography>
      <TextField
        size="small"
        label={t("pdpaGuardianPlaceholder")}
        value={token}
        onChange={(e) => setToken(e.target.value)}
        fullWidth
      />
      <Button variant="outlined" disabled={busy || token.length < 8} onClick={() => void submit()}>
        {t("pdpaGuardianSubmit")}
      </Button>
    </Box>
  );
}
