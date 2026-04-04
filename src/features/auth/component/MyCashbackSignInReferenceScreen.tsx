"use client";

import { MyCashbackSignInDesktopReference } from "@/features/auth/component/MyCashbackSignInDesktopReference";

/**
 * Route shell: centered column for the MyCashback desktop sign-in reference image.
 */
export default function MyCashbackSignInReferenceScreen() {
  return (
    <div className="mx-auto w-full max-w-[520px] px-6 pb-16 pt-8 md:px-8 md:pt-10">
      <MyCashbackSignInDesktopReference />
    </div>
  );
}
