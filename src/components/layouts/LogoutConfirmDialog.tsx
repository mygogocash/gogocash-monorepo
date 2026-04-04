"use client";

import { designSystemColor } from "@/constants/design-system";
import { Dialog } from "@mui/material";
import Image from "next/image";
import { useTranslations } from "next-intl";

type LogoutConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

/**
 * GoGoCash 1.1 — logout confirmation (Figma node 9380:294260 / 8288:111049).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=9380-294260
 */
export default function LogoutConfirmDialog({
  open,
  onClose,
  onConfirm,
}: LogoutConfirmDialogProps) {
  const t = useTranslations();

  const dialogAriaLabel = `${t("logoutConfirmLine1")} ${t("logoutConfirmLine2")}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-label={dialogAriaLabel}
      slotProps={{
        paper: {
          elevation: 8,
          sx: {
            margin: 2,
            maxWidth: 320,
            width: "100%",
            borderRadius: "24px",
            overflow: "hidden",
          },
        },
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.45)" } },
      }}
    >
      <div className="flex flex-col items-center gap-6 px-6 pt-12 pb-6">
        <div className="relative size-[134px] shrink-0 overflow-hidden" aria-hidden>
          <Image
            src="/profile/logout-door-illustration.svg"
            alt=""
            fill
            unoptimized
            className="object-contain"
            sizes="134px"
          />
        </div>
        <div className="flex w-full flex-col gap-4">
          <div className="text-center text-xl font-semibold leading-normal text-[#3b3b3b]">
            <span className="mb-0 block">{t("logoutConfirmLine1")}</span>
            <span className="mb-0 block">{t("logoutConfirmLine2")}</span>
          </div>
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 min-h-0 flex-1 cursor-pointer items-center justify-center rounded-full border-0 px-6 text-base font-medium text-white transition-opacity hover:opacity-92 active:opacity-88"
              style={{ backgroundColor: designSystemColor.mint }}
            >
              {t("logoutConfirmNo")}
            </button>
            <button
              type="button"
              onClick={() => void onConfirm()}
              className="flex h-10 min-h-0 max-h-[52px] flex-1 cursor-pointer items-center justify-center rounded-full border-0 px-3.5 py-3 text-base font-medium transition-opacity hover:opacity-92 active:opacity-88"
              style={{
                backgroundColor: "#d8f8ef",
                color: designSystemColor.green2,
              }}
            >
              {t("logoutConfirmYes")}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
