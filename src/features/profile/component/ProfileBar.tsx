"use client";
import ArrowIcon from "@/components/icons/ArrowIcon";
import PremiumAvatar from "@/components/premium/PremiumAvatar";
import PremiumMark from "@/components/premium/PremiumMark";
import { isPremiumTier } from "@/components/premium/premiumTokens";
import { designSystemColor } from "@/constants/design-system";
import type { MembershipTier } from "@/interfaces/auth";
import { combineAvailableBalance } from "@/lib/withdraw/combineAvailableBalance";
import { checkThai, formatAddress, formatCashDisplay } from "@/lib/utils";
import { useIsInMiniPay } from "@/lib/web3/useIsInMiniPay";
import { useIsWalletUser } from "@/lib/web3/useIsWalletUser";
import { useSessionContext } from "@/providers/SessionContext";
import { Box, Popper } from "@mui/material";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React, { useCallback, useEffect, useRef } from "react";
import ProfileHeaderPopperContent from "./ProfileHeaderPopperContent";

const ProfileBar = () => {
  const t = useTranslations();
  const { data: session } = useSession();
  const { getCheck } = useSessionContext();
  const isInMiniPay = useIsInMiniPay();
  const isWalletUser = useIsWalletUser();
  const showMiniPayBadge = isInMiniPay || isWalletUser;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(anchorEl ? null : event.currentTarget);
    },
    [anchorEl]
  );

  const open = Boolean(anchorEl);
  const id = open ? "simple-popper" : undefined;

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const thai = session?.user?.region === "Thailand" || checkThai;
  const combinedDisplay = combineAvailableBalance(getCheck, thai);

  /*
   * Temporary preview flag: NEXT_PUBLIC_GOGOPASS_PREVIEW=1 renders every
   * logged-in user as a GoGoPass member so we can demo the premium
   * treatment before the membership API is wired into the session.
   * Replace with `session?.user?.membership_tier` once available.
   */
  const sessionTier = (session?.user as { membership_tier?: MembershipTier } | undefined)
    ?.membership_tier;
  const previewEnabled = process.env.NEXT_PUBLIC_GOGOPASS_PREVIEW === "1";
  const membershipTier: MembershipTier | undefined =
    sessionTier ?? (previewEnabled && session?.user ? "gogopass" : undefined);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // ตรวจสอบว่าได้คลิกนอก Popper Container และนอก Trigger Button หรือไม่
      if (
        popperRef.current &&
        !popperRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    }

    // เพิ่ม event listener เมื่อ Popper เปิดอยู่
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup: ลบ event listener เมื่อ component unmount หรือ Popper ปิด
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, handleClose]); // เมื่อ open เปลี่ยนสถานะ หรือ handleClose เปลี่ยน (useCallback ช่วยให้ไม่เปลี่ยน)

  return (
    <>
      <div
        ref={triggerRef}
        className="gc-soft-panel flex h-12 w-fit items-center gap-2.5 rounded-full px-2"
        onClick={handleClick}
      >
        <PremiumAvatar tier={membershipTier} size={34}>
          <Image
            src="/profile.png"
            alt="Avatar"
            width={128}
            height={128}
            sizes="34px"
            quality={92}
            className="h-full w-full rounded-full object-cover"
          />
        </PremiumAvatar>
        <div className="lg:block hidden min-w-0 pr-0.5">
          {/*
           * Premium users get a bolder, darker name — signals hierarchy.
           * A tiny gold verification mark sits after the name (like a
           * Twitter blue tick but gold). The full "GoGoPass" label lives
           * in the popper and on larger profile surfaces — putting it
           * here again competes with the username at this compact size.
           */}
          <div className="flex items-center leading-tight">
            <p
              className={`text-[13px] line-clamp-1 ${
                isPremiumTier(membershipTier)
                  ? "font-semibold text-[#3B3B3B]"
                  : "font-normal text-[#87948B]"
              }`}
            >
              {showMiniPayBadge && session?.user?.wallet
                ? formatAddress(session.user.wallet)
                : (session?.user?.username != "undefined" ? session?.user?.username : "USER") ||
                  (session?.user?.wallet != "undefined"
                    ? formatAddress(session?.user?.wallet || "")
                    : "USER")}
            </p>
            {showMiniPayBadge ? (
              <span
                className="ml-1.5 rounded-full bg-[#E8FBF4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#00AA80]"
                aria-label={t("minipayBadgeLabel")}
              >
                {t("minipayBadgeLabel")}
              </span>
            ) : null}
            <PremiumMark tier={membershipTier} size={13} marginLeft={5} />
          </div>
          <p
            className="mt-0.5 text-[14px] font-medium leading-tight tabular-nums"
            style={{ color: designSystemColor.mint }}
          >
            {formatCashDisplay(combinedDisplay)} {thai ? "THB" : "USD"}
          </p>
        </div>
        <ArrowIcon
          fill={designSystemColor.mint}
          className={`${open ? "rotate-180" : ""} duration-200 lg:block hidden`}
        />
      </div>

      <Popper
        id={id}
        open={open}
        anchorEl={anchorEl}
        placement="bottom-end"
        ref={popperRef}
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
      >
        <Box
          sx={{
            border: "1px solid #E4E4E4",
            borderRadius: "24px",
            p: "16px",
            bgcolor: "background.paper",
            mt: 2,
            width: "384px",
            maxWidth: "calc(100vw - 24px)",
            boxSizing: "border-box",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            /* Match header search popper: cap height to viewport so menus stay reachable on small laptops */
            maxHeight: "min(72vh, 640px)",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <ProfileHeaderPopperContent onNavigate={handleClose} />
        </Box>
      </Popper>
    </>
  );
};
export default ProfileBar;
