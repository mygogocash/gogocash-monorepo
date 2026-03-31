import PageLoader from "@/components/common/PageLoader";
import { DataOffer } from "@/interfaces/offer";

interface IProp {
  offer: DataOffer | undefined;
  openLinkOffer: () => void;
}

const LoadingShop = ({ offer, openLinkOffer }: IProp) => {
  return (
    <>
      <h5 className="mt-10 text-center text-[30px] font-semibold text-black">
        Moving to <span className="text-[#00B14F]">{offer?.offer_name || ""}</span> . . .
      </h5>
      <div className="my-8 flex min-h-[200px] items-center justify-center">
        <PageLoader />
      </div>
      <p className="mb-10 text-center text-[18px] text-[#A9A9A9]">
        Waiting too long?{" "}
        <span className="cursor-pointer text-[#5D87FF]" onClick={() => openLinkOffer()}>
          Click here
        </span>{" "}
        to get your merchant page ready.
      </p>
    </>
  );
};

export default LoadingShop;
