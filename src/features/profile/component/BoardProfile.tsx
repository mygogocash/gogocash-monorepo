import Button from "@/components/common/Button";
import WithdrawIcon from "@/components/icons/WithdrawIcon";
import { Link, useRouter } from "@/i18n/navigation";
import { checkThai, formatAddress, formatNumber } from "@/lib/utils";
import { useCrossmintLoginContext } from "@/providers/CrossmintLoginContext";
import { Box, Divider } from "@mui/material";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";

const BoardProfile = () => {
  const { data: session } = useSession();
  const t = useTranslations();
  const { getCheck } = useCrossmintLoginContext();
  const router = useRouter();
  return (
    <Box
      className="gc-soft-panel md:mb-8 mb-2"
      sx={{
        padding: "20px",
        background:
          "radial-gradient(circle at top right, rgba(0, 177, 79, 0.2), transparent 40%), linear-gradient(135deg, #103522 0%, #0E4D2A 55%, #00B14F 120%)",
      }}
    >
      <div className="flex items-center gap-2 mb-[16.5px]">
        <Image
          src="/profile2.png"
          alt="Avatar"
          width={128}
          height={128}
          sizes="32px"
          quality={92}
          className="h-8 w-8 rounded-full object-cover"
        />
        <div>
          <p className="text-[16px] text-[#F6F6F6] font-semibold">
            {(session?.user?.username != "undefined" ? session?.user?.username : "USER") ||
              (session?.user?.wallet != "undefined"
                ? formatAddress(session?.user?.wallet || "")
                : "USER")}
          </p>
          <Link href={"/profile"} className="flex items-center gap-1">
            <p className="text-[12px] text-[#D4F6E1]">{t("View Profile")}</p>
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="leading-[30px]">
          <p className="text-[32px] text-white font-semibold">
            {formatNumber(checkThai ? getCheck?.netAmountTHB || 0 : getCheck?.netAmount || 0)}{" "}
            {checkThai ? "THB" : "USD"}
          </p>
          <p className="text-[14px] text-[#D4F6E1]">{t("Withdrawable Cashback")}</p>
        </div>
        <div className="flex flex-col items-center cursor-pointer">
          <Link href={"/withdraw"}>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/18 backdrop-blur">
              <WithdrawIcon />
            </div>
            <p className="text-[12px] text-white">{t("Withdraw")}</p>
          </Link>
        </div>
      </div>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", my: 2.5 }} />
      <div className="flex items-center justify-between mt-4">
        <p className="text-[#D4F6E1] text-[12px]">
          {t("Total Cashback")}{" "}
          <span className="text-white">
            {formatNumber(
              session?.user?.region === "Thailand"
                ? getCheck?.netAmountTHB || 0
                : getCheck?.netAmount || 0
            )}{" "}
            {session?.user?.region === "Thailand" ? "THB" : "USD"}
          </span>
        </p>
        <Button
          uiVariant="secondary"
          uiSize="sm"
          onClick={() => {
            router.push("/wallet");
          }}
        >
          {t("View Wallet")}
        </Button>
      </div>
    </Box>
  );
};

export default BoardProfile;
