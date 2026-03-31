import { useTranslations } from "next-intl";
import Image from "next/image";
interface TabTitleProps {
  activeTab: number;
  setActiveTab: (index: number) => void;
}
const TabTitle = ({ activeTab, setActiveTab }: TabTitleProps) => {
  const t = useTranslations();
  // const active =
  //   "w-1/2 flex items-center justify-center gap-2 bg-white text-gray-900 font-medium px-6 py-3 rounded-t-lg shadow-[0_-2px_5px_rgba(0,0,0,0.05)] focus:outline-none";
  // const inactive =
  //   "w-1/2 flex items-center justify-center gap-2 bg-gray-100 text-gray-600 font-medium px-6 py-3 rounded-t-lg hover:bg-gray-200 focus:outline-none";
  return (
    <>
      <div className="relative h-[50px] flex items-center justify-center">
        <div
          onClick={() => {
            setActiveTab(0);
          }}
          // w-[33.33%]
          className={`${activeTab === 0 ? "z-99" : ""} w-[150px] absolute left-[calc(50%-200px)]  h-auto flex items-center justify-center flex-col`}
        >
          <p
            className={`text-[13px] bg-size-[150px] ${activeTab === 0 ? "bg-[url(/quest/tab_white2.svg)]" : "bg-[url(/quest/tab_grey.svg)]"}  min-h-[45px]  w-full bg-no-repeat bg-center flex items-center justify-center`}
          >
            {t("How to win!")}
          </p>
          <hr className={`${activeTab === 0 ? "border-b border-black w-10" : ""}`} />
        </div>
        <div
          onClick={() => {
            setActiveTab(1);
          }}
          className={`${activeTab === 1 ? "z-99" : ""} w-[150px] absolute left-[calc(50%-80px)] h-auto flex items-center justify-center flex-col`}
        >
          <p
            className={`text-[13px] bg-size-[150px] ${activeTab === 1 ? "bg-[url(/quest/tab_white2.svg)]" : "bg-[url(/quest/tab_grey.svg)]"}  min-h-[45px]  w-full bg-no-repeat bg-center flex items-center justify-center`}
          >
            {t("Tasks")}
          </p>
          <hr className={`${activeTab === 1 ? "border-b border-black  w-10" : ""}`} />
        </div>
        <div
          onClick={() => {
            setActiveTab(2);
          }}
          className={`${activeTab === 2 ? "z-99" : ""} w-[150px] absolute left-[calc(50%+40px)]  h-auto flex items-center justify-center flex-col`}
        >
          {/* <div className="flex items-center justify-center"> */}
          <div
            className={`bg-size-[150px] ${activeTab === 2 ? "bg-[url(/quest/tab_white2.svg)]" : "bg-[url(/quest/tab_grey.svg)]"}  min-h-[45px] w-full bg-no-repeat bg-center flex items-center justify-center`}
          >
            <Image src={`/quest/champ.png`} alt="champ" width={14} height={14} />
            <p className="text-[13px] ">{t("Leaderboard")}</p>
          </div>
          <hr className={`${activeTab === 2 ? "border-b border-black w-10 " : ""} `} />
        </div>
      </div>

      {/* <div className="flex justify-center bg-white w-full">
        <div className="flex space-x-1 bg-gray-50 rounded-t-lg p-1 w-full">
          <button
            onClick={() => {
              setActiveTab(0);
            }}
            className={activeTab === 0 ? active : inactive}
          >
            Tasks
          </button>

          <button
            onClick={() => {
              setActiveTab(1);
            }}
            className={activeTab === 1 ? active : inactive}
          >
            <Image
              src={`/quest/champ.png`}
              alt="champ"
              width={14}
              height={14}
            />
            Leaderboard
          </button>
        </div>
      </div> */}
    </>
  );
};

export default TabTitle;
