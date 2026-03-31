import BadgeQuest from "@/features/quest/component/BadgeQuest";
import Image from "next/image";
import MyRank from "./MyRank";
import { QuestRankResponse } from "@/interfaces/quest";
import { formatAddress, formatNumber } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
interface ListRankProps {
  list: QuestRankResponse[] | undefined;
  myQuest?: QuestRankResponse | undefined;
}
const ListRank = ({ list, myQuest }: ListRankProps) => {
  return (
    <div className="flex flex-col">
      <Link href="/shop">
        <Image
          src="/quest/banner2.png"
          alt="Quest Image 2"
          width={484}
          height={320}
          className="rounded-lg w-full h-auto"
        />
      </Link>
      {myQuest && <MyRank myQuest={myQuest} />}
      <div className="flex items-center gap-2 my-5">
        <Image
          src={`/quest/champ.png`}
          alt="champ"
          width={46}
          height={55}
          className="w-6 h-[29px] lg:w-[46px] lg:h-[55px]"
        />

        <h1 className="lg:text-[30px] text-[24px]  font-semibold text-[#005D46]">GoGoQuest</h1>
      </div>
      <div className="flex flex-col w-full lg:min-w-[495px] max-h-[790px] lg:max-h-[1013px] overflow-y-auto">
        {list &&
          list?.map((item, index) => {
            return (
              <div
                key={index}
                className="flex items-center justify-between border-b border-gray-300 pb-4 mb-4"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={`/profile_quest.png`}
                    alt="shop"
                    width={48}
                    height={48}
                    className="rounded-full w-9 h-9 lg:w-12 lg:h-12"
                  />

                  <p className="text-[12px] lg:text-[18px] text-black">
                    {item.username?.length <= 11
                      ? item.username?.trim().slice(0, 3) + "..." + item.username?.trim().slice(-3)
                      : formatAddress(item.username?.trim() || "", 6, 6)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {index === 0 ? (
                    <Image
                      src={`/quest/rank1.png`}
                      alt="rank1"
                      width={46}
                      height={55}
                      className="w-6 h-[29px] lg:w-[46px] lg:h-[55px]"
                    />
                  ) : index === 1 ? (
                    <Image
                      src={`/quest/rank2.png`}
                      alt="rank2"
                      width={46}
                      height={55}
                      className="w-6 h-[29px] lg:w-[46px] lg:h-[55px]"
                    />
                  ) : index === 2 ? (
                    <Image
                      src={`/quest/rank3.png`}
                      alt="rank3"
                      width={46}
                      height={55}
                      className="w-6 h-[29px] lg:w-[46px] lg:h-[55px]"
                    />
                  ) : (
                    <Image
                      src={`/quest/rank4.png`}
                      alt="rank4"
                      width={46}
                      height={55}
                      className="w-6 h-[29px] lg:w-[46px] lg:h-[55px]"
                    />
                  )}
                  <BadgeQuest
                    title={formatNumber(item.point || 0, 0)}
                    icon={
                      <Image
                        src="/quest/bath.svg"
                        alt="coin"
                        width={37.5}
                        height={37.5}
                        className="rounded-full w-[15px] h-[15px] lg:w-[37.5px] lg:h-[37.5px]"
                      />
                    }
                    theme="bg-[#F6F6F6] text-[#00CC99] text-[12px] lg:text-[24px] font-bold flex-row-reverse !pl-1 !py-1 !pr-3"
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ListRank;
