"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

import { MEMBERSHIP_QUEST_END } from "./landing/constants";
import { setupFaqAccordion } from "./landing/setupFaqAccordion";
import { setupHashNavigation } from "./landing/setupHashNavigation";
import { setupRevealAndStats } from "./landing/setupRevealAndStats";
import { setupRippleButtons } from "./landing/setupRippleButtons";
import { setupSpendCalculator } from "./landing/setupSpendCalculator";
import type { MembershipLandingI18n } from "./landing/types";

export type { MembershipLandingI18n } from "./landing/types";

/**
 * Imperative behaviors for the membership landing (theme, calculators, observers).
 * Scoped to `rootRef` so we do not touch `document.documentElement` or global DOM.
 *
 * Theme is fixed to **light (day)** so the page matches the profile shell (`SubPage` on `#f6f6f6`)
 * and stays readable regardless of OS dark mode.
 */
export function useMembershipLanding(
  rootRef: RefObject<HTMLElement | null>,
  i18n?: MembershipLandingI18n
) {
  const theme = "light" as const;
  const [countdownText, setCountdownText] = useState("");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const endedLabel = i18n?.countdownEnded ?? "Ended";

    const tick = () => {
      const diff = MEMBERSHIP_QUEST_END.getTime() - Date.now();
      if (diff <= 0) {
        setCountdownText(endedLabel);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdownText(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rootRef, i18n?.countdownEnded]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupSpendCalculator(root);
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupRevealAndStats(root);
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupFaqAccordion(root);
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupRippleButtons(root);
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupHashNavigation(root);
  }, [rootRef]);

  return {
    theme,
    countdownText,
  };
}
