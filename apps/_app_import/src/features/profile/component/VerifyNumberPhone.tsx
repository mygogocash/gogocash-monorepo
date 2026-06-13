"use client";
import Input from "@/components/common/Input";
import { useState } from "react";
import { formatPhone, normalizeE164, validatePhone } from "@/lib/phone";
import { CountryCode } from "libphonenumber-js";
import metadata from "libphonenumber-js/metadata.full.json";
import SubPage from "../layout/SubPage";
import { Divider, MenuItem, Select, Step } from "@mui/material";
import Button from "@/components/common/Button";
import { useRouter } from "@/i18n/navigation";
import { sendOtp } from "../firebase/fc";
import toast from "react-hot-toast";
const VerifyNumberPhone = () => {
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode>("TH");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(true);

  const formatted = formatPhone(phone, country);
  const isValid = validatePhone(formatted, country);
  const countries = metadata?.countries
    ? Object.entries(metadata.countries).map(([code, country]) => {
        const dial = metadata.country_calling_codes?.[code]?.[0];
        return {
          code,
          name: country?.[0],
          dial,
        };
      })
    : [];

  const handleSendOtp = async () => {
    if (isValid) {
      setLoading(true);
      setTime(true);
      const normalized = normalizeE164(formatted, country);
      sendOtp(normalized!)
        .then(() => {
          toast.success("OTP sent successfully");
          router.push(`/profile/cf-phone?phone=${encodeURIComponent(normalized!)}`);
        })
        .catch(() => {
          toast.error("Failed to send OTP. Please try again.");
        });
      setTimeout(() => {
        setLoading(false);
        setTime(false);
      }, 60000); // 1 minute timeout
    }
  };

  return (
    <SubPage title="Verify Phone" showSubMenu>
      <h1 className=" text-[#00B14F] text-[26px] font-semibold">Change Your Phone Number</h1>
      <div>
        <h5 className="text-black text-[16px]">Enter Current Phone Number</h5>
        <p className="text-[14px] text-[#656565]">
          To keep your account secure, please enter current mobile phone number linked to your
          account before updating your phone number.
        </p>
      </div>
      <Step />
      <div
        className={`lg:flex ${
          !isValid && phone ? "items-center " : "items-end"
        } justify-between gap-3 space-y-3`}
      >
        <Select
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode)}
          className="  p-2 rounded-2xl! h-14 mb-0! w-[200px]"
        >
          {countries.map((c) => (
            <MenuItem key={c.code} value={c.code}>
              {c.name} ({c.code})
            </MenuItem>
          ))}
        </Select>
        <div className="w-full">
          <Input
            className="w-full "
            sx={{
              " .MuiInputBase-root": { borderRadius: "16px" },
            }}
            placeholder="Mobile Number"
            // defaultValue={session?.user?.mobile || ""}
            onChange={(event) => setPhone(event.target.value)}
          />
          {!isValid && phone && (
            <p className={`text-red-500 ${!isValid && phone ? " " : "mt-1"} text-[9px]`}>
              Invalid phone number
            </p>
          )}
        </div>
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
          loading={loading}
          disabled={!isValid || loading}
          onClick={() => {
            handleSendOtp();
          }}
        >
          Continue
        </Button>
      </div>
      {!time && <p className="text-right text-[red] text-sm">Please wait for 1 minute</p>}
    </SubPage>
  );
};
export default VerifyNumberPhone;
