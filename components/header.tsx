"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "@/components/icons";
import { LINE_MINI_APP_HREF, WEB_APP_QUEST_HREF } from "@/components/social-data";
import GoGoCashLogo from "./gogocash-logo";
import LaunchAppLink from "@/components/launch-app-link";
import { LocaleDropdown } from "./locale-menu";
import {
  getSectionedLandingBasePath,
  isSectionedLandingPath,
} from "@/lib/locale-routing";
import { getHeaderNavLabelsForPathname } from "@/lib/header-nav-labels";
import { usePrefersReducedMotionAfterMount } from "@/hooks/use-prefers-reduced-motion";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import {
  twCtaPrimaryMotion,
  twDurButton,
  twEaseStandard,
  twFocusRingPrimary,
  twNavTextMotion,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";
import { uiCtaPrimarySurface } from "@/lib/ui-classes";

/** Document order (top → bottom) for scroll spy. Must match `id`s on the page. */
const NAV_SECTION_ORDER = [
  "home",
  "brands",
  "how-it-works",
  "faq",
] as const;

/** Viewport Y (px) used for “which section is active” — aligns ~`scroll-mt-28`. */
const SPY_Y = 120;

const DRAWER_EASE = [0.23, 1, 0.32, 1] as const;

type SectionId = (typeof NAV_SECTION_ORDER)[number];

export default function Header() {
  const pathname = usePathname();
  const navLabels = useMemo(
    () => getHeaderNavLabelsForPathname(pathname),
    [pathname],
  );
  const navHashItems = useMemo(
    () =>
      [
        { label: navLabels.home, href: "#home" as const },
        { label: navLabels.brands, href: "#brands" as const },
        { label: navLabels.howItWorks, href: "#how-it-works" as const },
        { label: navLabels.faq, href: "#faq" as const },
      ] as const,
    [navLabels],
  );
  const onHomePage = useMemo(() => isSectionedLandingPath(pathname), [pathname]);
  const homeBase = useMemo(
    () => getSectionedLandingBasePath(pathname),
    [pathname],
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduceMotion = usePrefersReducedMotionAfterMount();
  const drawerTransition = useMemo(
    () =>
      reduceMotion ? { duration: 0 } : { duration: 0.34, ease: DRAWER_EASE },
    [reduceMotion],
  );
  const navListVariants = useMemo(
    () =>
      reduceMotion
        ? { hidden: {}, show: {} }
        : {
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.042,
                delayChildren: 0.06,
              },
            },
          },
    [reduceMotion],
  );
  const navItemVariants = useMemo(
    () =>
      reduceMotion
        ? {
            hidden: { opacity: 1, x: 0 },
            show: { opacity: 1, x: 0 },
          }
        : {
            hidden: { opacity: 0, x: -14 },
            show: {
              opacity: 1,
              x: 0,
              transition: { duration: 0.24, ease: DRAWER_EASE },
            },
          },
    [reduceMotion],
  );
  const {
    activeSection,
    scrolled,
    lockActiveSection,
  } = useScrollSpy<SectionId>({
    enabled: onHomePage,
    sectionIds: NAV_SECTION_ORDER,
    spyY: SPY_Y,
  });

  const handleNavClick = (id: SectionId) => {
    lockActiveSection(id);
  };

  return (
    <header
      role="banner"
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top,0px)] animate-header-enter motion-reduce:animate-none motion-reduce:opacity-100 transition-[background-color,box-shadow,backdrop-filter] duration-button ease-standard ${
        scrolled
          ? "bg-white/80 shadow-[0_1px_0_rgba(0,0,0,0.05)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex min-w-0 max-w-site items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
        {onHomePage ? (
          <a
            href="#home"
            onClick={() => handleNavClick("home")}
            className="flex min-h-11 min-w-0 shrink items-center gap-2"
          >
            <GoGoCashLogo className="h-8" variant="color" />
          </a>
        ) : (
          <Link
            href={`${homeBase}#home`}
            className="flex min-h-11 min-w-0 shrink items-center gap-2"
          >
            <GoGoCashLogo className="h-8" variant="color" />
          </Link>
        )}

        <nav
          className="hidden items-center md:flex"
          aria-label={navLabels.mainNavAria}
        >
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-1.5 py-1 backdrop-blur-sm lg:gap-1.5 lg:px-2">
            <div className="flex items-center gap-0.5 lg:gap-1">
              {navHashItems.map((item) => {
                const id = item.href.slice(1) as SectionId;
                const sectionHref = onHomePage
                  ? item.href
                  : `${homeBase}${item.href}`;
                const navItemClass = `relative flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium lg:px-4 ${twNavTextMotion}`;
                if (onHomePage) {
                  return (
                    <a
                      key={item.href}
                      href={sectionHref}
                      onClick={() => handleNavClick(id)}
                      className={`${navItemClass} ${
                        activeSection === id
                          ? "text-primary"
                          : "text-[#6b7280] hover:text-[#1f2937]"
                      }`}
                      aria-current={activeSection === id ? "location" : undefined}
                    >
                      {activeSection === id && (
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-primary ${twDurButton} ${twEaseStandard} transition-opacity motion-reduce:duration-micro`} />
                      )}
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={sectionHref}
                    className={`${navItemClass} text-[#6b7280] hover:text-[#1f2937]`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <Link
              href="/learn"
              className={`flex min-h-10 items-center rounded-full px-3 py-2 text-sm font-medium text-[#6b7280] hover:text-[#1f2937] lg:px-4 ${twNavTextMotion}`}
            >
              {navLabels.learn}
            </Link>
            <a
              href={WEB_APP_QUEST_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-10 items-center rounded-full px-3 py-2 text-sm font-medium text-[#6b7280] hover:text-[#1f2937] lg:px-4 ${twNavTextMotion}`}
            >
              {navLabels.quest}
            </a>
          </div>
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <LocaleDropdown />
          <LaunchAppLink
            surface="header"
            className={`group max-sm:max-w-[10.5rem] max-sm:gap-1 max-sm:px-3 max-sm:py-2.5 max-sm:text-xs max-sm:leading-snug min-h-11 items-center justify-center gap-2 px-4 py-3 text-sm sm:max-w-none sm:px-6 md:px-8 md:py-3.5 ${uiCtaPrimarySurface} ${twCtaPrimaryMotion}`}
          >
            <span className="min-w-0 text-center">{navLabels.startEarning}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </LaunchAppLink>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#1f2937] md:hidden ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
            aria-expanded={mobileMenuOpen}
            aria-label={navLabels.toggleMenuAria}
          >
            <span
              className="relative flex h-6 w-6 flex-col justify-center gap-1.5"
              aria-hidden
            >
              <span
                className={`block h-0.5 w-[22px] shrink-0 origin-center rounded-full bg-current transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                  mobileMenuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-[22px] shrink-0 rounded-full bg-current transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                  mobileMenuOpen ? "scale-x-0 opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-[22px] shrink-0 origin-center rounded-full bg-current transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                  mobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            key="mobile-nav-drawer"
            initial={reduceMotion ? undefined : { opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={drawerTransition}
            className="origin-top border-t border-gray-100 bg-white px-4 py-4 shadow-[0_18px_50px_-14px_rgba(15,23,42,0.14)] sm:px-6 md:hidden"
          >
            <motion.nav
              className="flex flex-col gap-1"
              aria-label={navLabels.mainNavAria}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              variants={navListVariants}
            >
              {navHashItems.map((item) => {
                const id = item.href.slice(1) as SectionId;
                const sectionHref = onHomePage
                  ? item.href
                  : `${homeBase}${item.href}`;
                const close = () => setMobileMenuOpen(false);
                if (onHomePage) {
                  return (
                    <motion.div
                      key={item.href}
                      variants={navItemVariants}
                      className="min-w-0"
                    >
                      <a
                        href={sectionHref}
                        onClick={() => {
                          handleNavClick(id);
                          close();
                        }}
                        className={`block min-h-11 rounded-lg px-4 py-3 text-sm font-medium ${twNavTextMotion} ${
                          activeSection === id
                            ? "bg-surface-green text-primary"
                            : "text-[#6b7280] hover:bg-gray-50"
                        }`}
                        aria-current={
                          activeSection === id ? "location" : undefined
                        }
                      >
                        {item.label}
                      </a>
                    </motion.div>
                  );
                }
                return (
                  <motion.div
                    key={item.href}
                    variants={navItemVariants}
                    className="min-w-0"
                  >
                    <Link
                      href={sectionHref}
                      onClick={close}
                      className={`block min-h-11 rounded-lg px-4 py-3 text-sm font-medium text-[#6b7280] hover:bg-gray-50 ${twNavTextMotion}`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
              <motion.div variants={navItemVariants} className="min-w-0">
                <Link
                  href="/learn"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block min-h-11 rounded-lg px-4 py-3 text-sm font-medium text-[#6b7280] hover:bg-gray-50 ${twNavTextMotion}`}
                >
                  {navLabels.learn}
                </Link>
              </motion.div>
              <motion.div variants={navItemVariants} className="min-w-0">
                <a
                  href={WEB_APP_QUEST_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block min-h-11 rounded-lg px-4 py-3 text-sm font-medium text-[#6b7280] hover:bg-gray-50 ${twNavTextMotion}`}
                >
                  {navLabels.quest}
                </a>
              </motion.div>
              <motion.div variants={navItemVariants} className="min-w-0">
                <a
                  href={LINE_MINI_APP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group mt-2 flex min-h-11 items-center justify-center gap-2 px-8 py-3.5 text-sm ${uiCtaPrimarySurface} ${twCtaPrimaryMotion}`}
                >
                  {navLabels.startEarning}
                  <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </a>
              </motion.div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
