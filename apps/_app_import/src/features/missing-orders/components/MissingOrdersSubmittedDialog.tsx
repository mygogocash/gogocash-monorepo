"use client";

import { desktopMenuBarNav } from "@/constants/navigation";
import { missingOrdersStaticT } from "@/features/missing-orders/missingOrdersStaticT";
import { useRouter } from "@/i18n/navigation";
import { Dialog } from "@mui/material";
import Image from "next/image";
import { useLocale } from "next-intl";

export type MissingOrdersSubmittedDialogProps = {
  open: boolean;
  onClose: () => void;
};

/** Figma GoGoCash 1.1 — node 9649:158939 (State Pop-Up): claim submitted success. */
export function MissingOrdersSubmittedDialog({ open, onClose }: MissingOrdersSubmittedDialogProps) {
  const locale = useLocale();
  const router = useRouter();
  const mo = (key: string) => missingOrdersStaticT(locale, key);

  const topBrandsHref = desktopMenuBarNav.find((item) => item.id === "top-brands")?.href ?? "/";

  const goWallet = () => {
    onClose();
    router.push("/wallet");
  };

  const goTopBrands = () => {
    onClose();
    router.push(topBrandsHref);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="missing-orders-submitted-title"
      aria-describedby="missing-orders-submitted-desc"
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.5)" } },
      }}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "24px",
          maxWidth: "480px",
          width: "100%",
          margin: "16px",
          overflow: "hidden",
        },
      }}
    >
      <div className="flex flex-col items-center gap-8 px-6 py-8 md:gap-10 md:px-8 md:py-8">
        <div
          className="relative h-[153px] w-[150px] shrink-0 drop-shadow-[4px_4px_8px_rgba(0,0,0,0.1)]"
          aria-hidden
        >
          <Image
            src="/missing-orders/document-submitted-state.png"
            alt=""
            width={150}
            height={153}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex w-full flex-col gap-1 text-center">
            <h2
              id="missing-orders-submitted-title"
              className="text-[28px] font-semibold leading-tight text-[#3b3b3b] md:text-[32px]"
            >
              {mo("missingOrdersSubmittedTitle")}
            </h2>
            <p
              id="missing-orders-submitted-desc"
              className="text-base font-normal leading-normal text-[#7f7f7f] md:text-lg"
            >
              {mo("missingOrdersSubmittedDescription")}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-4 md:gap-6">
            <button
              type="button"
              onClick={goWallet}
              className="flex h-14 min-w-[160px] max-w-[200px] flex-1 items-center justify-center rounded-full border border-[#00cc99] bg-white px-6 text-base font-medium text-[#00cc99] transition-opacity hover:opacity-90"
            >
              {mo("missingOrdersSubmittedGoWallet")}
            </button>
            <button
              type="button"
              onClick={goTopBrands}
              className="flex h-14 min-w-[160px] max-w-[200px] flex-1 items-center justify-center rounded-full bg-[#00cc99] px-6 text-base font-medium text-white transition-opacity hover:opacity-95"
            >
              {mo("missingOrdersSubmittedShopMore")}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
