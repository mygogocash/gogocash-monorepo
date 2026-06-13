"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useRef, type KeyboardEvent } from "react";

import {
  PROFILE_TAB_STRIP_LIST_CLASS,
  profileTabButtonClassName,
} from "@/lib/ui/profileTabStripClasses";

interface TabTitleProps {
  activeTab: number;
  setActiveTab: (index: number) => void;
}

const tabs = [
  { labelKey: "How to win!" },
  { labelKey: "Tasks" },
  { labelKey: "Leaderboard", champ: true },
] as const;

const questTabCount = tabs.length;

const TabTitle = ({ activeTab, setActiveTab }: TabTitleProps) => {
  const t = useTranslations();
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTabIndex = useCallback(
    (index: number) => {
      setActiveTab(index);
      queueMicrotask(() => {
        tabButtonRefs.current[index]?.focus();
      });
    },
    [setActiveTab]
  );

  const onTabListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        focusTabIndex((activeTab + 1) % questTabCount);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        focusTabIndex((activeTab - 1 + questTabCount) % questTabCount);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusTabIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        focusTabIndex(questTabCount - 1);
      }
    },
    [activeTab, focusTabIndex]
  );

  return (
    <div
      role="tablist"
      aria-label={t("questPagePlaySectionAria")}
      className={PROFILE_TAB_STRIP_LIST_CLASS}
      onKeyDown={onTabListKeyDown}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === index;
        return (
          <button
            key={tab.labelKey}
            ref={(el) => {
              tabButtonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`quest-tab-${index}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              focusTabIndex(index);
            }}
            className={profileTabButtonClassName(isActive)}
          >
            {"champ" in tab ? (
              <span className="flex min-w-0 items-center justify-center gap-0.5">
                <Image
                  src="/quest/champ.png"
                  alt=""
                  width={14}
                  height={14}
                  className="shrink-0"
                  aria-hidden
                />
                <span className="min-w-0 truncate">{t(tab.labelKey)}</span>
              </span>
            ) : (
              t(tab.labelKey)
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabTitle;
