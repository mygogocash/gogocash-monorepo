"use client";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import { Box, Button, Divider, List, ListItemButton, Popover, Stack } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import type { SxProps, Theme } from "@mui/material/styles";
import dayjs, { type Dayjs } from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState, type KeyboardEvent, type MouseEvent } from "react";

export type WalletTransactionDateRangeFilterProps = {
  /** Committed range (inclusive days). Both null = no filter. */
  valueStart: Dayjs | null;
  valueEnd: Dayjs | null;
  onCommit: (start: Dayjs | null, end: Dayjs | null) => void;
  /** Same shell styling as the wallet search row (pill + fill). */
  triggerSx: SxProps<Theme>;
};

export function WalletTransactionDateRangeFilter({
  valueStart,
  valueEnd,
  onCommit,
  triggerSx,
}: WalletTransactionDateRangeFilterProps) {
  const t = useTranslations();
  const panelId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [draftStart, setDraftStart] = useState<Dayjs | null>(valueStart);
  const [draftEnd, setDraftEnd] = useState<Dayjs | null>(valueEnd);

  const open = Boolean(anchorEl);

  const openPopover = useCallback(
    (target: HTMLElement) => {
      setDraftStart(valueStart);
      setDraftEnd(valueEnd);
      setAnchorEl(target);
    },
    [valueStart, valueEnd]
  );

  const closePopover = useCallback(() => setAnchorEl(null), []);

  const summary =
    valueStart && valueEnd
      ? `${valueStart.format("YYYY/MM/DD")} – ${valueEnd.format("YYYY/MM/DD")}`
      : "";

  const applyPreset = useCallback((start: Dayjs, end: Dayjs) => {
    setDraftStart(start);
    setDraftEnd(end);
  }, []);

  const handleUpdate = useCallback(() => {
    if (draftStart && draftEnd && draftEnd.isBefore(draftStart, "day")) {
      onCommit(draftEnd, draftStart);
    } else {
      onCommit(draftStart, draftEnd);
    }
    closePopover();
  }, [draftStart, draftEnd, onCommit, closePopover]);

  const handleClear = useCallback(() => {
    setDraftStart(null);
    setDraftEnd(null);
    onCommit(null, null);
    closePopover();
  }, [onCommit, closePopover]);

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPopover(e.currentTarget as HTMLElement);
    }
  };

  const rangeIncomplete =
    (draftStart === null && draftEnd !== null) || (draftStart !== null && draftEnd === null);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={triggerSx}>
        <Box
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={(e: MouseEvent<HTMLElement>) => openPopover(e.currentTarget)}
          onKeyDown={onTriggerKeyDown}
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            minHeight: 48,
            px: 1.75,
            borderRadius: "9999px",
            cursor: "pointer",
            outline: "none",
            "&:focus-visible": {
              boxShadow: "0 0 0 2px rgba(0, 204, 153, 0.35)",
            },
          }}
        >
          <CalendarTodayOutlinedIcon
            sx={{ color: "#9e9e9e", fontSize: 18, mr: 1, flexShrink: 0 }}
            aria-hidden
          />
          <span
            className="min-w-0 flex-1 truncate text-left text-sm"
            style={{ color: summary ? "#374151" : "#9e9e9e" }}
          >
            {summary || t("Date")}
          </span>
        </Box>
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            id: panelId,
            sx: {
              mt: 1,
              borderRadius: "16px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
              border: "1px solid #e4e4e4",
              minWidth: { xs: "min(100vw - 32px, 360px)", sm: 380 },
              maxWidth: "calc(100vw - 24px)",
            },
          },
        }}
      >
        <Stack spacing={2} sx={{ p: 2 }}>
          <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <ListItemButton
              sx={{ borderRadius: 1 }}
              onClick={() => applyPreset(dayjs().startOf("day"), dayjs().endOf("day"))}
            >
              {t("walletTransactionsDatePresetToday")}
            </ListItemButton>
            <ListItemButton
              sx={{ borderRadius: 1 }}
              onClick={() =>
                applyPreset(dayjs().subtract(6, "day").startOf("day"), dayjs().endOf("day"))
              }
            >
              {t("walletTransactionsDatePresetLast7Days")}
            </ListItemButton>
            <ListItemButton
              sx={{ borderRadius: 1 }}
              onClick={() =>
                applyPreset(dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day"))
              }
            >
              {t("walletTransactionsDatePresetLast30Days")}
            </ListItemButton>
            <ListItemButton
              sx={{ borderRadius: 1 }}
              onClick={() => {
                const monthEnd = dayjs().endOf("month");
                const todayEnd = dayjs().endOf("day");
                applyPreset(
                  dayjs().startOf("month").startOf("day"),
                  monthEnd.isAfter(todayEnd, "day") ? todayEnd : monthEnd
                );
              }}
            >
              {t("walletTransactionsDatePresetThisMonth")}
            </ListItemButton>
            <ListItemButton sx={{ borderRadius: 1 }} onClick={handleClear}>
              {t("walletTransactionsDatePresetClear")}
            </ListItemButton>
          </List>

          <Divider />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <DatePicker
              label={t("walletTransactionsDateStart")}
              value={draftStart}
              onChange={(v) => setDraftStart(v)}
              maxDate={draftEnd ?? dayjs()}
              slotProps={{
                popper: { disablePortal: true },
                textField: { size: "small", fullWidth: true },
              }}
            />
            <DatePicker
              label={t("walletTransactionsDateEnd")}
              value={draftEnd}
              onChange={(v) => setDraftEnd(v)}
              minDate={draftStart ?? undefined}
              maxDate={dayjs()}
              slotProps={{
                popper: { disablePortal: true },
                textField: { size: "small", fullWidth: true },
              }}
            />
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              color="inherit"
              onClick={closePopover}
              sx={{ borderColor: "#e0e0e0" }}
            >
              {t("walletTransactionsDateCancel")}
            </Button>
            <Button
              variant="contained"
              onClick={handleUpdate}
              disabled={rangeIncomplete}
              sx={{ bgcolor: "#00aa80", "&:hover": { bgcolor: "#009970" } }}
            >
              {t("walletTransactionsDateApply")}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </LocalizationProvider>
  );
}
