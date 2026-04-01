"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

import { MEMBERSHIP_QUEST_END } from "./landing/constants";
import { setupConfettiCta } from "./landing/setupConfettiCta";
import { setupFaqAccordion } from "./landing/setupFaqAccordion";
import { setupHashNavigation } from "./landing/setupHashNavigation";
import { setupHeroCountUp } from "./landing/setupHeroCountUp";
import { setupQuestTasks } from "./landing/setupQuestTasks";
import { setupRevealAndStats } from "./landing/setupRevealAndStats";
import { setupRippleButtons } from "./landing/setupRippleButtons";
import { setupSpendCalculator } from "./landing/setupSpendCalculator";
import { setupStreakGrid } from "./landing/setupStreakGrid";
import type { MembershipLandingI18n } from "./landing/types";

export type { MembershipLandingI18n } from "./landing/types";

function subscribePrefersDark(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getPrefersDarkSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Server snapshot must be stable; client may differ until after paint — root uses suppressHydrationWarning. */
function getServerPrefersDarkSnapshot() {
  return false;
}

/**
 * Imperative behaviors for the membership landing (theme, calculators, observers).
 * Scoped to `rootRef` so we do not touch `document.documentElement` or global DOM.
 */
export function useMembershipLanding(
  rootRef: RefObject<HTMLElement | null>,
  i18n?: MembershipLandingI18n
) {
  const systemPrefersDark = useSyncExternalStore(
    subscribePrefersDark,
    getPrefersDarkSnapshot,
    getServerPrefersDarkSnapshot
  );
  const theme = systemPrefersDark ? "dark" : "light";
  const [countdownText, setCountdownText] = useState("");
  const questCompletedRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tick = () => {
      const diff = MEMBERSHIP_QUEST_END.getTime() - Date.now();
      if (diff <= 0) {
        setCountdownText("Ended");
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
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupHeroCountUp(root);
  }, [rootRef]);

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
    return setupStreakGrid(root, i18n);
  }, [rootRef, i18n]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupQuestTasks(root, i18n, questCompletedRef);
  }, [rootRef, i18n]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupRippleButtons(root);
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return setupConfettiCta(root);
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
