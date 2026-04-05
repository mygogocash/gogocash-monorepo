"use client";
import SubPage from "../layout/SubPage";
import CardProfile from "./CardProfile";
import ProfileDesktopPersonalPanel, {
  PROFILE_PERSONAL_INFORMATION_SECTION_ID,
  type ProfileExtendedForm,
} from "./ProfileDesktopPersonalPanel";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { WITHDRAW_FLOW_COLLECT_IDENTITY } from "@/lib/profile/withdrawFlowRoutes";
import { fetcher, fetcherPost, fetcherPut } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { ResGetBalanceMyCashback } from "@/interfaces/userMyCashback";
import { checkThai } from "@/lib/utils";
import React from "react";
import toast from "react-hot-toast";
import BoardProfile from "./BoardProfile";
import ProfileCashbackSummaryCard from "./ProfileCashbackSummaryCard";
import { ResponseWithdrawCheckMyCashback } from "@/interfaces/auth";
import { useCrossmintLoginContext } from "@/providers/CrossmintLoginContext";

const ProfileInfo = () => {
  const { data: session, update } = useSession();
  const { getCheck } = useCrossmintLoginContext();
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openPersonalEditingFromWithdraw =
    searchParams.get("flow") === WITHDRAW_FLOW_COLLECT_IDENTITY;
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<ProfileExtendedForm>({
    username: "",
    birthdate: "",
    gender: "",
    idType: "national",
    idNumber: "",
    address: "",
    country: "",
    state: "",
    city: "",
    zip: "",
  });

  const { data: balanceMyCashback } = useQuery<ResGetBalanceMyCashback>({
    queryKey: ["balanceMyCashback"],
    queryFn: () => fetcher(`/user/balance/me/mycashback`),
    staleTime: Infinity,
  });

  const { data: myCashback } = useQuery<ResponseWithdrawCheckMyCashback>({
    queryKey: ["myCashback"],
    queryFn: () => fetcherPost(`/withdraw/check-my-cashback`),
    enabled: session?.user !== null,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  React.useEffect(() => {
    if (!openPersonalEditingFromWithdraw) return;
    const scrollToPersonal = () => {
      document.getElementById(PROFILE_PERSONAL_INFORMATION_SECTION_ID)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };
    const timeoutId = window.setTimeout(scrollToPersonal, 200);
    return () => window.clearTimeout(timeoutId);
  }, [openPersonalEditingFromWithdraw]);

  const saveProfile = async (): Promise<boolean> => {
    setLoading(true);
    toast.loading("Saving...");
    try {
      if (
        (formData.username || session?.user?.username) &&
        (formData.birthdate || session?.user?.birthdate) &&
        (formData.gender || session?.user?.gender)
      ) {
        const res = await fetcherPut([
          `/user/profile`,
          {
            data: {
              username: formData.username || session?.user?.username,
              birthdate: formData.birthdate || session?.user?.birthdate,
              gender: formData.gender || session?.user?.gender,
            },
          },
        ]);
        if (res) {
          update({
            ...session,
            user: { ...session?.user, ...res },
          });
          toast.success("Profile updated successfully");
          setLoading(false);
          toast.dismiss();
          return true;
        }
        setLoading(false);
        toast.dismiss();
        return false;
      }
      toast.error("Please fill all fields");
      setLoading(false);
      toast.dismiss();
      return false;
    } catch (e) {
      toast.error(`Error: Save profile failed ` + JSON.stringify(e));
      setLoading(false);
      toast.dismiss();
      return false;
    }
  };

  return (
    <>
      <SubPage title="Profile" showSubMenu>
        <div className="flex w-full flex-col gap-6">
          {balanceMyCashback?.user?.mobile || session?.user?.mobile ? null : (
            <div className="flex w-full justify-end">
              <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-3 rounded-full bg-[rgba(205,13,13,0.1)] px-4 py-2 md:w-auto">
                <p className="text-base leading-normal">
                  <span className="text-[#3b3b3b]">{t("verifyStatusPrefix")}</span>{" "}
                  <span className="font-medium text-[#CD0D0D]">{t("verifyStatusDontVerify")}</span>
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/profile/info");
                    }}
                    className="rounded-full bg-[#3b3b3b] px-3 py-1 text-xs font-medium text-white"
                  >
                    {t("verifyEmailButton")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/profile/verify-phone");
                    }}
                    className="rounded-full bg-[#3b3b3b] px-3 py-1 text-xs font-medium text-white"
                  >
                    {t("verifyPhoneNoButton")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="hidden lg:block">
            <CardProfile />
          </div>
          <div className="block lg:hidden">
            <BoardProfile />
          </div>

          {myCashback ? (
            <ProfileCashbackSummaryCard
              myCashback={myCashback}
              getCheck={getCheck}
              checkThai={checkThai}
              onWithdraw={() => router.push("/withdraw")}
            />
          ) : null}

          <ProfileDesktopPersonalPanel
            formData={formData}
            setFormData={setFormData}
            loading={loading}
            onSave={saveProfile}
            session={session ?? null}
            balanceMyCashback={balanceMyCashback}
            initialEditing={openPersonalEditingFromWithdraw}
          />
        </div>
      </SubPage>
    </>
  );
};

export default ProfileInfo;
