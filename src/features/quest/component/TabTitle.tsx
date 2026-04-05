import Image from "next/image";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface TabTitleProps {
  activeTab: number;
  setActiveTab: (index: number) => void;
}

const TAB_SVGS = {
  active: "bg-[url(/quest/tab_white2.svg)]",
  inactive: "bg-[url(/quest/tab_grey.svg)]",
} as const;

const labelSurfaceClass =
  "box-border min-h-[45px] w-full bg-[length:100%_100%] bg-center bg-no-repeat text-center text-[13px] leading-snug text-gray-900 antialiased max-[380px]:text-[11px]";

const INACTIVE_Z = ["z-0", "z-[1]", "z-[2]"] as const;

const tabs = [
  { positionClass: "left-[calc(50%-200px)]", labelKey: "How to win!" },
  { positionClass: "left-[calc(50%-80px)]", labelKey: "Tasks" },
  { positionClass: "left-[calc(50%+40px)]", labelKey: "Leaderboard", champ: true },
] as const;

const TabTitle = ({ activeTab, setActiveTab }: TabTitleProps) => {
  const t = useTranslations();

  return (
    <div className="relative flex h-[50px] items-center justify-center" role="tablist">
      {tabs.map((tab, index) => {
        const isActive = activeTab === index;
        return (
          <button
            key={tab.labelKey}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setActiveTab(index);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                setActiveTab((index + 1) % tabs.length);
              }
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                setActiveTab((index - 1 + tabs.length) % tabs.length);
              }
            }}
            className={cn(
              "absolute top-auto flex h-auto w-[150px] max-w-[33.333%] cursor-pointer select-none flex-col items-center justify-center border-0 bg-transparent p-0 touch-manipulation outline-none",
              tab.positionClass,
              isActive ? "z-[99]" : INACTIVE_Z[index],
              "focus-visible:z-[100] focus-visible:ring-2 focus-visible:ring-[#00CC99]/35 focus-visible:ring-offset-2"
            )}
          >
            {"champ" in tab ? (
              <div
                className={cn(
                  labelSurfaceClass,
                  TAB_SVGS[isActive ? "active" : "inactive"],
                  "flex items-center justify-center gap-0.5 px-1"
                )}
              >
                <Image
                  src="/quest/champ.png"
                  alt=""
                  width={14}
                  height={14}
                  className="shrink-0"
                  aria-hidden
                />
                <span className="min-w-0 truncate">{t(tab.labelKey)}</span>
              </div>
            ) : (
              <span
                className={cn(
                  labelSurfaceClass,
                  TAB_SVGS[isActive ? "active" : "inactive"],
                  "flex items-center justify-center px-1"
                )}
              >
                {t(tab.labelKey)}
              </span>
            )}
            <hr
              className={cn(
                "m-0 border-0 border-solid border-black p-0",
                isActive ? "mt-0 w-10 border-b-2 border-black" : "h-0 w-0 overflow-hidden border-0"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default TabTitle;
