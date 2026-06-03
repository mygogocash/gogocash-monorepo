"use client";

import { useCallback } from "react";
import { LINE_MINI_APP_HREF, WEB_APP_HREF } from "@/components/social-data";
import { logLaunchAppClick } from "@/lib/analytics-client";
import { sendLineTagConversion } from "@/lib/line-tag";

type LaunchAppLinkProps = {
  className: string;
  children: React.ReactNode;
  /** Where on the page this CTA sits (hero, final, feature, header, quests). */
  surface?: string;
};

/**
 * Desktop (md+): opens web app. Mobile: opens LINE Mini App.
 * Pass full button styles in `className`; visibility toggles are applied here.
 */
export default function LaunchAppLink({
  className,
  children,
  surface = "unknown",
}: LaunchAppLinkProps) {
  const external = {
    target: "_blank" as const,
    rel: "noopener noreferrer" as const,
  };

  const onWeb = useCallback(() => {
    logLaunchAppClick("web_desktop", surface);
  }, [surface]);
  const onLine = useCallback(() => {
    logLaunchAppClick("line_mobile", surface);
    sendLineTagConversion();
  }, [surface]);

  return (
    <>
      <a
        href={WEB_APP_HREF}
        {...external}
        onClick={onWeb}
        className={`${className} hidden md:inline-flex`}
      >
        {children}
      </a>
      <a
        href={LINE_MINI_APP_HREF}
        {...external}
        onClick={onLine}
        className={`${className} inline-flex md:hidden`}
      >
        {children}
      </a>
    </>
  );
}
