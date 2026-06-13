import type { TooltipProps } from "@mui/material/Tooltip";

/**
 * Shared MUI Tooltip `slotProps` for on-brand help popovers (wallet, withdraw).
 * Keeps visual treatment consistent and avoids copy-paste drift.
 */
export const helpTooltipMuiSlotProps = {
  tooltip: {
    sx: {
      maxWidth: 340,
      bgcolor: "#fff",
      color: "#031819",
      border: "1px solid #7f7f7f",
      boxShadow: "0px 1px 7.4px rgba(0,0,0,0.05), 4px 4px 12px rgba(0,0,0,0.15)",
      p: 1.5,
    },
  },
  arrow: {
    sx: { color: "#fff", "&::before": { border: "1px solid #7f7f7f" } },
  },
} satisfies NonNullable<TooltipProps["slotProps"]>;
