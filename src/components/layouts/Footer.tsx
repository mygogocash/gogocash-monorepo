"use client";

import { LogoMark } from "@/components/brand/LogoMark";
import FooterSocialIcon from "@/components/layouts/FooterSocialIcon";
import { FOOTER_SECTIONS } from "@/constants/footer-links";
import { SOCIAL_ICONS } from "@/constants/footer-social";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const linkClass =
  "text-sm text-[#6b7280] transition-colors hover:text-[#1f2937]";

const Footer = () => {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="relative bottom-0 hidden w-full bg-white pt-20 pb-8 md:block"
    >
      <div className="mx-auto min-w-0 max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex min-w-0 shrink-0 items-center gap-2 rounded-lg hover:opacity-90"
              aria-label={t("favoritePageHeroLogoAlt")}
            >
              <LogoMark />
              <span className="text-xl font-bold tracking-tight text-[#1f2937]">
                {t("GoGoCash")}
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-16">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.titleKey}>
                <h4 className="text-sm font-semibold text-[#1f2937]">
                  {t(section.titleKey)}
                </h4>
                <ul className="mt-4 flex flex-col gap-3">
                  {section.items.map((item) => {
                    const external = item.href.startsWith("http");
                    const label = t(item.labelKey);
                    return (
                      <li
                        key={`${section.titleKey}-${item.labelKey}-${item.href}`}
                      >
                        {external ? (
                          <a
                            href={item.href}
                            className={linkClass}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {label}
                          </a>
                        ) : (
                          <Link href={item.href} className={linkClass}>
                            {label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-6 border-t border-gray-100 pt-8 sm:flex-row sm:justify-between">
          <p className="text-sm text-[#6b7280]">
            {t("footerCopyright", { year })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {SOCIAL_ICONS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#6b7280] transition-colors hover:bg-gray-50 hover:text-[#1f2937]"
              >
                <FooterSocialIcon name={social.icon} />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-[#9ca3af]">
          {t("footerRiskDisclaimer")}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
