"use client";
import { useState } from "react";
import SubPage from "../layout/SubPage";
import { Divider } from "@mui/material";
import Button from "@/components/common/Button";
import { useRouter } from "@/i18n/navigation";
import { confirmOtp, loginWithFirebase } from "../firebase/fc";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import OtpInput from "@/components/common/OtpInput";
const CFNumberPhone = () => {
  const router = useRouter();
  const { update, data: session } = useSession();
  const [phone, setPhone] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleConfirm = async () => {
    if (!session?.user?.access_token) {
      toast.error("Access token is missing");
      return;
    }
    setLoading(true);
    const code = await confirmOtp(phone);
    if (!code) {
      toast.error("OTP code has expired. Please request a new one.");
      window.location.href = "/profile/verify-phone";
      return;
    }
    loginWithFirebase(code, session?.user?.access_token || "")
      .then((res) => {
        if (!res) return;
        toast.success("Saved successfully");
        update({
          ...session,
          user: { ...session?.user, ...res.user },
        });
        router.push("/profile/info");
      })
      .catch((error: Error) => {
        toast.error(`Error: ${error.message}`);
      });
    setLoading(false);
  };
  return (
    <SubPage title="Verify Phone" showSubMenu>
      <h1 className=" text-[#00B14F] text-[26px] font-semibold">Verification Code</h1>
      <div>
        <h5 className="text-black text-[16px]">Enter Current Phone Number</h5>
        <p className="text-[14px] text-[#656565]">
          We’ll send a verification code to confirm your number.
        </p>
      </div>

      <div className={`flex ${"items-center "} justify-center gap-1`}>
        <OtpInput onChange={setPhone} />
      </div>
      <Divider />
      <div className="flex items-center justify-between">
        <Button
          bgColor="white"
          fontColor="black"
          border="1px solid #c4c4c4"
          onClick={() => {
            router.back();
          }}
        >
          Back
        </Button>
        <Button
          disabled={loading || phone.length < 6}
          loading={loading}
          onClick={async () => {
            handleConfirm();
          }}
        >
          Continue
        </Button>
      </div>
    </SubPage>
  );
};
export default CFNumberPhone;
