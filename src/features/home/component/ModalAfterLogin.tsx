"use client";
import Close from "@mui/icons-material/Close";
import { IconButton } from "@mui/material";
import Image from "next/image";
import React, { useCallback, useEffect } from "react";

const AUTO_DISMISS_MS = 30_000;

const ModalAfterLogin = () => {
  const [showModal, setShowModal] = React.useState(false);

  const dismissModal = useCallback(() => {
    window.sessionStorage.removeItem("showModalAfterLogin");
    setShowModal(false);
  }, []);

  useEffect(() => {
    if (window.sessionStorage.getItem("showModalAfterLogin") === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowModal(true);
    }
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const id = window.setTimeout(dismissModal, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [showModal, dismissModal]);
  return (
    <>
      {showModal ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center">
          {/* Figma GoGoCash 1.1 — Black Background (9030:917132): support/black @ 50% opacity */}
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          <div className="relative z-10 bg-[url(/home/popup-intro.png)] bg-center bg-no-repeat bg-cover p-6 rounded-lg shadow-lg w-[1025px] h-[536px]">
            <div className="flex items-center justify-end w-full">
              <IconButton sx={{ bgcolor: "white" }} onClick={dismissModal}>
                <Close />
              </IconButton>
            </div>
            <div className="md:flex items-center justify-around h-[calc(100%-40px)]">
              <div className="w-full">
                <h1 className="lg:text-left text-center text-[40px] lg:text-[64px] font-semibold text-black">
                  Every <span className="text-[#00B14F]">Purchase Pays</span> You Back.
                </h1>
              </div>
              <div className="w-full">
                <div className="absolute bottom-0 right-4">
                  <Image
                    src={`/home/mobile-intro.png`}
                    alt="mobile-intro"
                    width={452}
                    height={68}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ModalAfterLogin;
