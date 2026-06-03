import Image from "next/image";
import Link from "next/link";
import GoGoCashLogo from "./gogocash-logo";
import {
  twFocusRingPrimary,
  twNavTextMotion,
  twOpacityHoverMotion,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";
import { SOCIAL_ICONS } from "@/components/social-data";
import SocialIcon from "@/components/social-icon";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { FOOTER_LINKS, FOOTER_TRUST_ROW_COLUMN } from "@/lib/footer-links";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer role="contentinfo" className="bg-white pt-20 pb-8">
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        {/* Top section */}
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          {/* Left: Logo */}
          <div className="max-w-sm">
            <Link
              href="/#home"
              className={`inline-flex min-w-0 shrink-0 rounded-lg hover:opacity-90 ${twOpacityHoverMotion} ${twFocusRingPrimary}`}
              aria-label="GoGoCash — back to home"
            >
              <GoGoCashLogo variant="color" />
            </Link>
          </div>

          {/* Right: Link columns */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-16">
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-[#1f2937]">
                  {title}
                </h4>
                <ul className="mt-4 flex flex-col gap-3">
                  {links.map((link) => {
                    const external = link.href.startsWith("http");
                    const className = `text-sm text-[#6b7280] hover:text-[#1f2937] ${twNavTextMotion}`;
                    return (
                      <li key={link.label}>
                        {link.label === "Cookie Settings" ? (
                          <CookieSettingsButton
                            className={`${className} text-left`}
                          >
                            {link.label}
                          </CookieSettingsButton>
                        ) : external ? (
                          <a
                            href={link.href}
                            className={className}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link href={link.href} className={className}>
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {/* Trust row appended to the Company column so the footer
                    matches the customer app (gogocash_app Footer.tsx). */}
                {title === FOOTER_TRUST_ROW_COLUMN ? (
                  <div className="mt-6 flex flex-col items-start gap-2">
                    <span className="text-xs font-medium text-[#6b7280]">
                      Secured by
                    </span>
                    <a
                      href="https://www.cloudflare.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex shrink-0 opacity-90 hover:opacity-100 ${twOpacityHoverMotion} ${twFocusRingPrimary}`}
                      aria-label="Cloudflare"
                    >
                      <Image
                        src="/branding/cloudflare-logo.png"
                        alt=""
                        width={200}
                        height={80}
                        className="h-8 w-auto max-w-[min(100%,200px)] object-contain object-left"
                        sizes="200px"
                      />
                    </a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-6 border-t border-gray-100 pt-8 sm:flex-row sm:justify-between">
          <p className="text-sm text-[#6b7280]">
            &copy; {year} Copyright - Made with{" "}
            <span className="text-primary">💚</span> by GoGoCash
          </p>

          <div className="grid grid-cols-4 justify-items-center gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
            {SOCIAL_ICONS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#6b7280] hover:bg-gray-50 hover:text-[#1f2937] ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
              >
                <SocialIcon name={social.icon} />
              </a>
            ))}
          </div>
        </div>

        {/* Risk disclaimer — below copyright / social */}
        <p className="mt-8 text-xs leading-relaxed text-[#9ca3af]">
          Cashback rates, merchant availability, and product features may
          change. GoGoCash does not provide financial, investment, or tax
          advice. Saving Plus and related offerings involve risk; read terms
          before participating. Past performance is not indicative of future
          results.
        </p>
      </div>
    </footer>
  );
}
