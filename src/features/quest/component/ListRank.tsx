import BadgeQuest from "@/features/quest/component/BadgeQuest";
import Image from "next/image";
import MyRank from "./MyRank";
import QuestHistoryNavLink from "./QuestHistoryNavLink";
import { QuestRankResponse } from "@/interfaces/quest";
import { cn, formatAddress, formatNumber } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
interface ListRankProps {
  list: QuestRankResponse[] | undefined;
  myQuest?: QuestRankResponse | undefined;
  /** Hide the promo banner above the rank card (e.g. embedded profile history page). */
  hidePromoBanner?: boolean;
  /** When set, each row shows a control to open details (e.g. history page). */
  onViewPlayer?: (item: QuestRankResponse) => void;
  viewPlayerLabel?: string;
}
const ListRank = ({
  list,
  myQuest,
  hidePromoBanner,
  onViewPlayer,
  viewPlayerLabel,
}: ListRankProps) => {
  return (
    <div className="flex flex-col">
      {!hidePromoBanner ? (
        <Link href="/shop">
          <Image
            src="/quest/banner2.png"
            alt="Quest Image 2"
            width={484}
            height={320}
            className="rounded-lg w-full h-auto"
          />
        </Link>
      ) : null}
      {myQuest && <MyRank myQuest={myQuest} />}
      <div className="my-5 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src={`/quest/champ.png`}
            alt="champ"
            width={46}
            height={55}
            className="h-[29px] w-6 shrink-0 lg:h-[55px] lg:w-[46px]"
          />

          <h1 className="truncate text-[24px] font-semibold text-[#005D46] lg:text-[30px]">
            GoGoQuest
          </h1>
        </div>
        <QuestHistoryNavLink variant="inline" className="shrink-0" />
      </div>
      <div className="flex w-full max-h-[790px] flex-col divide-y divide-[#E0E0E0] overflow-y-auto lg:min-w-[495px] lg:max-w-full lg:max-h-[1013px]">
        {list &&
          list?.map((item, index) => {
            return (
              <div
                key={`${item.user_id}-${index}`}
                className="flex min-h-[56px] flex-nowrap items-center justify-between gap-3 py-3 md:min-h-[65px] md:py-4 lg:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                  <Image
                    src={`/profile_quest.png`}
                    alt="shop"
                    width={48}
                    height={48}
                    className="size-9 shrink-0 rounded-full lg:size-12"
                  />

                  <p className="min-w-0 truncate text-[18px] font-normal leading-snug text-black">
                    {item.username?.length <= 11
                      ? item.username?.trim().slice(0, 3) + "..." + item.username?.trim().slice(-3)
                      : formatAddress(item.username?.trim() || "", 6, 6)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 lg:gap-3">
                  {index <= 9 ? (
                    <div
                      className={cn(
                        /* lg slot matches BadgeQuest row (~46px) */
                        "relative h-[29px] w-6 shrink-0 overflow-hidden lg:h-[46px] lg:w-[46px]",
                        /* Rage 1st–5th assets (228×260): slightly wider slot */
                        index <= 4 && "w-[26px] lg:w-[50px]"
                      )}
                    >
                      <Image
                        src={
                          index === 0
                            ? "/quest/rank1.png"
                            : index === 1
                              ? "/quest/rank2.png"
                              : index === 2
                                ? "/quest/rank3.png"
                                : index === 3
                                  ? "/quest/rank4.png"
                                  : index === 4
                                    ? "/quest/rank5.png"
                                    : "/quest/rank6_10.png"
                        }
                        alt={
                          index === 0
                            ? "rank1"
                            : index === 1
                              ? "rank2"
                              : index === 2
                                ? "rank3"
                                : index === 3
                                  ? "rank4"
                                  : index === 4
                                    ? "rank5"
                                    : "rank6-10"
                        }
                        fill
                        sizes="(min-width: 1024px) 50px, 26px"
                        className={cn(
                          "object-contain object-center",
                          /* All top-10 trophy PNGs are 157×176 (or scaled similarly); match slot weight */
                          "origin-center scale-[1.08] lg:scale-[1.066]"
                        )}
                      />
                    </div>
                  ) : null}
                  <BadgeQuest
                    title={formatNumber(item.point || 0, 0)}
                    icon={
                      <Image
                        src="/quest/bath.svg"
                        alt="coin"
                        width={24}
                        height={24}
                        className="size-[18px] shrink-0 rounded-full lg:size-5"
                      />
                    }
                    theme="bg-[#F6F6F6] text-[#00CC99] text-[18px] font-medium leading-snug flex-row-reverse !px-3 !py-1.5"
                  />
                  {onViewPlayer && viewPlayerLabel ? (
                    <button
                      type="button"
                      onClick={() => onViewPlayer(item)}
                      className="min-h-[44px] rounded-xl border border-[#00aa80]/40 bg-white px-3 py-2.5 text-[13px] font-semibold text-[#00aa80] transition-colors hover:bg-[#00aa80]/10 lg:px-4 lg:py-2 lg:text-[14px]"
                    >
                      {viewPlayerLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ListRank;
