"use client";

import {
  GOGOCASH_GITBOOK_LEARN_REGISTER_HREF,
  GOGOCASH_GITBOOK_LEARN_SHOPPING_HREF,
  SUPPORT_LINE_OFFICIAL_HREF,
} from "@/constants/navigation";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { missingOrdersStaticT } from "@/features/missing-orders/missingOrdersStaticT";
import { useLocale } from "next-intl";
import type { SvgIconComponent } from "@mui/icons-material";

const cardClass =
  "group flex min-h-[148px] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#3b3b3b]/50 bg-white no-underline transition-shadow hover:shadow-md sm:min-h-[160px]";

const gradientBg =
  "bg-[radial-gradient(ellipse_at_top_right,_rgba(0,204,153,0.35)_0%,_rgba(255,255,255,0.95)_55%,_rgb(217,217,217)_100%)]";

/**
 * Quick links — Cashback, User Guide, Team Support (Figma 9620:204906).
 */
export default function MissingOrdersQuickCards() {
  const locale = useLocale();
  const mo = (key: string) => missingOrdersStaticT(locale, key);

  const cards = [
    {
      href: GOGOCASH_GITBOOK_LEARN_SHOPPING_HREF,
      icon: ShoppingBagOutlinedIcon,
      line1: "missingOrdersQuickHowToGet",
      line2: "missingOrdersQuickCashback",
    },
    {
      href: GOGOCASH_GITBOOK_LEARN_REGISTER_HREF,
      icon: MenuBookIcon,
      line1: "missingOrdersQuickStepByStep",
      line2: "missingOrdersQuickUserGuide",
    },
    {
      /** LINE Official Account — same URL as `getSupportHref` / footer / sidebar Help. */
      href: SUPPORT_LINE_OFFICIAL_HREF,
      icon: ChatBubbleOutlineIcon,
      line1: "missingOrdersQuickContact",
      line2: "missingOrdersQuickTeamSupport",
      lineOfficialAccount: true,
    },
  ] as const;

  const cardBody = (Icon: SvgIconComponent, line1: string, line2: string) => (
    <>
      <div
        className={`relative flex h-[72px] w-full shrink-0 items-center justify-center sm:h-[76px] ${gradientBg}`}
        aria-hidden
      >
        <Icon sx={{ fontSize: 44, color: "#00AA80", opacity: 0.9 }} />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 py-3 text-center">
        <span className="text-[15px] font-normal leading-snug text-[#3b3b3b] sm:text-[16px]">
          {mo(line1)}
        </span>
        <span className="text-lg font-semibold leading-tight text-[#00AA80] sm:text-xl">
          {mo(line2)}
        </span>
      </div>
    </>
  );

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3 md:gap-4">
      {cards.map(({ href, icon: Icon, line1, line2, ...rest }) => {
        const body = cardBody(Icon, line1, line2);
        const lineOfficialAccount =
          "lineOfficialAccount" in rest && rest.lineOfficialAccount === true;
        const supportAriaLabel = lineOfficialAccount
          ? `${mo("missingOrdersQuickContact")} ${mo("missingOrdersQuickTeamSupport")} — ${mo("withdrawContactSupportLineOaSub")}`
          : undefined;

        return (
          <a
            key={line2}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cardClass}
            aria-label={supportAriaLabel}
          >
            {body}
          </a>
        );
      })}
    </div>
  );
}
