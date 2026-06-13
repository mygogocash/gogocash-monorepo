import Image from "next/image";
import SectionBadge from "@/components/section-badge";
import AnimateOnScroll from "@/components/animate-on-scroll";
import { LINE_MINI_APP_HREF, WEB_APP_HREF } from "@/components/social-data";
import { ArrowUpRight } from "@/components/icons";
import {
  twCtaOutlineMotion,
  twDurButton,
  twEaseStandard,
  twFocusRingPrimary,
  twOpacityHoverMotion,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";
import { uiCtaOutlineBrand, uiSectionTitle } from "@/lib/ui-classes";

export default function AppDownloadSection() {
  return (
    <section
      id="download-app"
      className="scroll-mt-28 bg-cream py-16 md:py-24"
    >
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <AnimateOnScroll>
            <div>
              <SectionBadge label="Launch App" />
              <h2 className={`mt-6 ${uiSectionTitle}`}>
                Start GoGoCash with your favorite app
              </h2>
              <p className="mt-4 text-base text-gray-500">
                Use Telegram or LINE mini apps, or open the web app — same
                cashback, optimized for small screens.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Track offers and quests on the go
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Get notified when rates spike
                </li>
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="https://t.me/GoGoCashAppBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#229ED9] px-6 py-3 text-sm font-normal text-white hover:opacity-95 ${twOpacityHoverMotion} ${twPressSm} ${twFocusRingPrimary}`}
                >
                  Telegram Mini App
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </a>
                <a
                  href={LINE_MINI_APP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#06C755] px-6 py-3 text-sm font-normal text-white hover:opacity-95 ${twOpacityHoverMotion} ${twPressSm} ${twFocusRingPrimary}`}
                >
                  LINE Mini App
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </a>
                <a
                  href={WEB_APP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex min-h-11 items-center justify-center gap-2 px-6 py-3 text-sm ${uiCtaOutlineBrand} ${twCtaOutlineMotion}`}
                >
                  Open web app
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </a>
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={150}>
            <div className="mx-auto flex max-w-sm flex-col items-center rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm lg:mx-0 lg:max-w-none">
              <p className="text-sm font-medium text-gray-500">Scan to open</p>
              <a
                href={LINE_MINI_APP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 block rounded-2xl border border-gray-200 bg-white p-2 shadow-inner hover:border-[#06C755]/40 ${twTransitionButton} ${twFocusRingPrimary}`}
                aria-label="Open GoGoCash LINE Mini App (QR code)"
              >
                <Image
                  src="/images/qr-gogocash-line-miniapp.webp"
                  alt="QR code to open GoGoCash LINE Mini App"
                  width={224}
                  height={224}
                  className="h-56 w-56 rounded-xl object-contain md:h-64 md:w-64"
                  priority={false}
                />
              </a>
              <p className="mt-4 text-xs text-gray-500">
                Opens the{" "}
                <a
                  href={LINE_MINI_APP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-medium text-[#06C755] underline-offset-2 hover:underline ${twDurButton} ${twEaseStandard} transition-colors motion-reduce:duration-micro`}
                >
                  GoGoCash LINE Mini App
                </a>
                . You can also use Telegram or the web app on the left.
              </p>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
