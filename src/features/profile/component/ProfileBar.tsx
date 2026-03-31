"use client";
import ArrowIcon from "@/components/icons/ArrowIcon";
import { designSystemColor } from "@/constants/design-system";
import { combineAvailableBalance } from "@/lib/withdraw/combineAvailableBalance";
import { checkThai, formatAddress, formatCashDisplay } from "@/lib/utils";
import { useCrossmintLoginContext } from "@/providers/CrossmintLoginContext";
import { Box, Popper } from "@mui/material";
import { useSession } from "next-auth/react";
import Image from "next/image";
import React, { useCallback, useEffect, useRef } from "react";
import ProfileHeaderPopperContent from "./ProfileHeaderPopperContent";

const ProfileBar = () => {
  const { data: session } = useSession();
  const { getCheck } = useCrossmintLoginContext();
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
        className="gc-soft-panel flex h-12 w-fit items-center justify-center gap-2 rounded-full px-2"
        onClick={handleClick}
      >
        <Image
          src="/profile.png"
          alt="Avatar"
          width={128}
          height={128}
          sizes="34px"
          quality={92}
          className="h-[34px] w-[34px] rounded-full object-cover"
        />
        <div className="lg:block hidden">
          <p className="text-[12px] text-[#87948B] line-clamp-1">
            {(session?.user?.username != "undefined" ? session?.user?.username : "USER") ||
              (session?.user?.wallet != "undefined"
                ? formatAddress(session?.user?.wallet || "")
                : "USER")}
          </p>
          <p className="text-[14px] font-semibold" style={{ color: designSystemColor.mint }}>
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
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
          }}
        >
          <ProfileHeaderPopperContent onNavigate={handleClose} />
        </Box>
      </Popper>
    </>
  );
};
export default ProfileBar;
