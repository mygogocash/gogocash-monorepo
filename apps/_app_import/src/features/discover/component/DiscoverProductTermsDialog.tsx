"use client";

import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";

export type DiscoverProductTermsDialogProps = {
  open: boolean;
  onClose: () => void;
};

/** Terms & conditions copy for Discover product tiles (modal). */
export function DiscoverProductTermsDialog({ open, onClose }: DiscoverProductTermsDialogProps) {
  const t = useTranslations();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="discover-product-terms-title"
      aria-describedby="discover-product-terms-body"
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.45)" } },
      }}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "20px",
          maxWidth: "480px",
          width: "100%",
          margin: "16px",
        },
      }}
    >
      <DialogTitle
        id="discover-product-terms-title"
        component="h2"
        className="relative !pr-10 !text-lg !font-semibold !text-[#1a1a1a]"
      >
        {t("discoverTermsModalTitle")}
        <IconButton
          type="button"
          onClick={onClose}
          aria-label={t("preferencesCloseDialog")}
          className="!absolute !right-2 !top-2 text-[#3B3B3B]"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent id="discover-product-terms-body" className="!pt-0">
        <Typography variant="body2" className="whitespace-pre-line text-[#5a5a5a]">
          {t("discoverTermsModalBody")}
        </Typography>
      </DialogContent>
      <DialogActions className="!px-6 !pb-4">
        <Button
          variant="contained"
          onClick={onClose}
          className="rounded-full normal-case"
          sx={{ bgcolor: "#00AA80", "&:hover": { bgcolor: "#009970" } }}
        >
          {t("preferencesCloseDialog")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
