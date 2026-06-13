"use client";

import Image from "next/image";
import ViewAll from "@/components/common/ViewAll";

type HeaderVariant = "default" | "sectionRow" | "sectionTitleOnly";

interface HomeSectionHeaderProps {
  title: string;
  link?: string;
  icon?: string;
  badgeImage?: string;
  variant?: HeaderVariant;
}

function assertNever(x: never): never {
  throw new Error(`Unexpected header variant: ${String(x)}`);
}

/** Unified home rail title — matches `default` variant (#103522, extrabold). */
const homeSectionTitleClass =
  "min-w-0 text-[clamp(1.65rem,2.8vw,2.45rem)] font-extrabold leading-none tracking-[-0.045em] text-[#103522]";

const HomeSectionHeader = ({
  title,
  link,
  icon,
  badgeImage,
  variant = "default",
}: HomeSectionHeaderProps) => {
  switch (variant) {
    case "sectionRow":
      return (
        <div className="flex h-14 w-full items-center justify-between gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-4">
            {badgeImage ? (
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_rgba(16,34,23,0.08)]">
                <Image src={badgeImage} alt="" width={32} height={32} />
              </span>
            ) : null}
            <h2 className={homeSectionTitleClass}>{title}</h2>
            {icon ? (
              <span
                className="flex size-14 shrink-0 items-center justify-center text-[2rem] leading-none"
                aria-hidden
              >
                {icon}
              </span>
            ) : null}
          </div>
          {link ? <ViewAll link={link} /> : null}
        </div>
      );
    case "sectionTitleOnly":
      return (
        <div className="flex h-14 w-full items-center">
          <h2 className={homeSectionTitleClass}>{title}</h2>
        </div>
      );
    case "default":
      return (
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {badgeImage ? (
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_rgba(16,34,23,0.08)]">
                <Image src={badgeImage} alt="" width={24} height={24} />
              </span>
            ) : null}
            {icon ? (
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E7F8EE] text-[22px] text-[#103522]">
                {icon}
              </span>
            ) : null}
            <h2 className={homeSectionTitleClass}>{title}</h2>
          </div>
          <ViewAll link={link} />
        </div>
      );
    default:
      return assertNever(variant);
  }
};

export default HomeSectionHeader;
