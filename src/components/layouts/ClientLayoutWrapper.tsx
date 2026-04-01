"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import Footer from "@/components/layouts/Footer";
import LineOfficialFab from "@/components/layouts/LineOfficialFab";
import ConsentBanner from "@/components/pdpa/ConsentBanner";
import { NavigationLoadingProvider } from "@/components/providers/NavigationLoadingOverlay";
import { isMainFlexNonePath } from "@/lib/layout/mainFlexConfig";

// Dynamic imports split layout chunks; SSR enabled for faster first paint (header HTML in document).
const Header = dynamic(() => import("./Header"));
const SubHeader = dynamic(() => import("./SubHeader"));
const FooterMobile = dynamic(() => import("./FooterMobile"));

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

/**
 * Client shell: always paints header/main/footer for LCP/TTI (perf plan).
 * Crossmint readiness no longer blocks the layout; wallet flows handle SDK state locally.
 */
export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth");
  const isMainContentHeight = isMainFlexNonePath(pathname);

  return (
    <NavigationLoadingProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <SubHeader />
        <main
          className={`flex min-h-0 w-full flex-col bg-[#f6f6f6] pb-[108px] md:pb-0${isMainContentHeight ? " flex-none" : " flex-1"}${isAuthPage ? " gc-page-block" : ""}`}
        >
          {children}
        </main>
        <Footer />
        <FooterMobile />
        <LineOfficialFab />
        <ConsentBanner />
      </div>
    </NavigationLoadingProvider>
  );
}
