"use client";

import Image from "next/image";

/**
 * Empty-state illustration for referral invitations (single line-art asset).
 */
export default function ReferralEmptyInvitationIllustration() {
  return (
    <div
      className="relative mx-auto h-[143px] w-[250px] shrink-0 opacity-60"
      aria-hidden
      data-name="No Invitations"
    >
      <Image
        src="/referral/no-invitations-empty.png"
        alt=""
        width={1001}
        height={572}
        className="h-full w-full object-contain object-center"
        sizes="250px"
      />
    </div>
  );
}
