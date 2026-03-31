"use client";
import { BRAND_MINT_HEX } from "@/constants/brand";
import { LAYOUT_CONTENT_SHELL_CLASS } from "@/constants/layout-shell";
import { Content, FooterList1, Socail } from "@/constants/Data";
import { Link, useRouter } from "@/i18n/navigation";
import GoGoIcon from "../icons/GoGoIcon";
import { useTranslations } from "next-intl";

const Footer = () => {
  const router = useRouter();
  const t = useTranslations();
  const year = new Date().getFullYear();

  const navigate = (link: string) => {
    if (link?.startsWith("http")) {
      window.open(link, "_blank");
      return;
    }
    router.push(link);
  };

  return (
    <footer
      role="contentinfo"
      className="relative bottom-0 hidden w-full overflow-hidden py-10 md:block"
      style={{ backgroundColor: BRAND_MINT_HEX }}
    >
      {/* Figma 208:54403 — large “GO” watermark, ~40% layer opacity; full pattern fill + 50% reads clearly on mint */}
      <div
        className="pointer-events-none absolute right-0 top-[-60px] hidden h-[600px] w-[min(847px,58vw)] items-center justify-center overflow-visible md:flex"
        aria-hidden
      >
        <div className="flex-none -rotate-[9.27deg] opacity-50 motion-reduce:opacity-[0.38]">
          <GoGoIcon
            variant="footerWatermark"
            className="h-auto w-[min(780px,58vw)] max-w-none select-none"
            aria-hidden
          />
        </div>
      </div>

      <div className={`${LAYOUT_CONTENT_SHELL_CLASS} relative z-10 flex flex-col gap-6`}>
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <div className="flex flex-col gap-10 pb-14 lg:flex-row lg:items-start lg:justify-between lg:gap-0">
            <div className="flex w-full flex-wrap gap-x-14 gap-y-10 lg:max-w-[742px] lg:flex-nowrap">
              {FooterList1.map((section) => (
                <div key={section.title} className="w-[210px] max-w-full shrink-0">
                  <div className="flex flex-col gap-4 text-white">
                    <p className="text-[18px] font-semibold leading-normal">{t(section.title)}</p>
                    <ul className="flex flex-col gap-2">
                      {section.list.map((item) => (
                        <li key={`${section.title}-${item.title}-${item.link}`}>
                          <button
                            type="button"
                            onClick={() => navigate(item.link)}
                            className="text-left text-base font-normal leading-normal whitespace-nowrap hover:opacity-90"
                          >
                            {t(item.title)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[336px] lg:items-center lg:self-stretch">
              <p className="w-full text-center text-[18px] font-semibold leading-normal text-white">
                {t("Social Media")}
              </p>
              <div className="flex h-10 flex-wrap justify-center gap-4">
                {Socail.map((item) => (
                  <button
                    key={item.link}
                    type="button"
                    aria-label={item.ariaLabel}
                    onClick={() => {
                      if (item.link) window.open(item.link, "_blank");
                    }}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-solid border-white text-white transition-colors hover:bg-white/10"
                  >
                    <item.icon width={24} height={24} className="text-white" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="m-0 w-full border-0 border-b border-white p-0" />

          <div className="flex flex-col gap-4 text-center text-sm font-normal leading-normal text-white sm:flex-row sm:items-center sm:justify-between sm:text-left lg:whitespace-nowrap">
            <p>{t("footerCopyright", { year })}</p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
              {Content.map((item) => (
                <Link
                  href={item.link}
                  key={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-90"
                >
                  {t(item.title)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
