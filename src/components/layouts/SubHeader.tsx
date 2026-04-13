"use client";

import Image from "next/image";
import { MenuBarMaskedIcon } from "@/components/nav/MenuBarMaskedIcon";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { desktopMenuBarNav } from "@/constants/navigation";
import { LAYOUT_CONTENT_SHELL_CLASS } from "@/constants/layout-shell";
import { isMenuBarItemActive } from "@/lib/navigation/isInternalHrefActive";

const SubHeader = () => {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <div className="sticky top-20 z-30 hidden w-full shrink-0 bg-white md:block">
      <nav
        className={`${LAYOUT_CONTENT_SHELL_CLASS} box-border flex h-14 items-center justify-center py-2`}
        aria-label="Category navigation"
      >
        {/*
          Figma 93:4121 Content: h-[38px], gap-16px between tabs, items-end;
          each Menu Tab: gap-8 icon↔label, px-16 py-8, items-center.
          Top Brands: label then fire (no leading icon); others: icon then label.
        */}
        <ul className="flex h-[38px] max-w-full items-end justify-center gap-4 overflow-x-auto">
          {desktopMenuBarNav.map((item) => {
            const active = isMenuBarItemActive(pathname, item);
            const href = item.href;
            const label = t(item.translationKey);
            const isLead = item.menuTypography === "lead";
            const textClass = isLead ? "text-base font-normal" : "text-sm font-medium";

            const className = [
              "group relative flex h-full min-h-[38px] shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 transition-colors",
              item.wideTab ? "min-w-[174px] justify-center" : "",
              active ? "text-[#00B14F]" : "text-[#3B3B3B] hover:text-[#103522]",
            ]
              .filter(Boolean)
              .join(" ");

            const underline = (
              <span
                className={[
                  "absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-opacity",
                  active
                    ? "bg-[#00B14F] opacity-100"
                    : "bg-[#00B14F] opacity-0 group-hover:opacity-40",
                ].join(" ")}
                aria-hidden
              />
            );

            const labelNode = (
              <span className="inline-flex flex-col justify-center leading-0">
                <span className={`leading-normal ${textClass}`}>{label}</span>
              </span>
            );

            const iconNode =
              item.icon !== "none" ? (
                <span
                  className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden"
                  aria-hidden
                >
                  <MenuBarMaskedIcon kind={item.icon} active={active} variant="navbar" />
                </span>
              ) : null;

            const fireNode = item.showFire ? (
              <span
                className="relative flex h-4 w-[13px] shrink-0 items-center justify-center"
                aria-hidden
              >
                <Image src="/nav/menu-fire.png" alt="" fill className="object-cover" sizes="13px" />
              </span>
            ) : null;

            const content = (
              <>
                {iconNode}
                {labelNode}
                {fireNode}
                {underline}
              </>
            );

            if (item.external) {
              return (
                <li key={item.id} className="flex items-stretch">
                  <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                    {content}
                  </a>
                </li>
              );
            }

            return (
              <li key={item.id} className="flex items-stretch">
                <Link href={href} className={className}>
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default SubHeader;
