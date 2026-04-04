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
        <div className="fixed inset-0 z-90 flex items-center justify-center overflow-y-auto px-[clamp(1rem,4vw,120px)] py-8">
          {/* Figma GoGoCash 1.1 — Black Background (9030:917132): support/black @ 50% opacity */}
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          {/*
            Width matches `.gc-home-layout` content track (same clamp as globals.css).
            Desktop keeps 1025×536; mobile uses full track width and capped height.
          */}
          <div className="relative z-10 w-full max-w-[1025px] min-h-[min(320px,85dvh)] max-h-[min(536px,92dvh)] overflow-y-auto rounded-2xl bg-[url(/home/popup-intro.png)] bg-center bg-no-repeat bg-cover p-4 shadow-lg sm:p-6 md:h-[536px] md:min-h-[536px] md:max-h-none md:overflow-visible">
            <div className="flex w-full items-center justify-end">
              <IconButton sx={{ bgcolor: "white" }} onClick={dismissModal}>
                <Close />
              </IconButton>
            </div>
            <div className="flex flex-col items-stretch gap-4 pb-16 md:h-[calc(100%-40px)] md:flex-row md:items-center md:justify-around md:gap-6 md:pb-0">
              <div className="w-full">
                <h1 className="text-center text-[28px] font-semibold text-black sm:text-[36px] md:text-left md:text-[40px] lg:text-[64px]">
                  Every <span className="text-[#00B14F]">Purchase Pays</span> You Back.
                </h1>
              </div>
              <div className="relative w-full md:static">
                <div className="mt-4 flex justify-center md:absolute md:bottom-0 md:right-4 md:mt-0 md:justify-end">
                  <Image
                    src="/home/mobile-intro.png"
                    alt="mobile-intro"
                    width={452}
                    height={68}
                    className="h-auto max-w-full"
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
