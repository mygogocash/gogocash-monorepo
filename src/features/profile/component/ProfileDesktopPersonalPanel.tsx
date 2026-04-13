"use client";

import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { Link, useRouter } from "@/i18n/navigation";
import Edit from "@mui/icons-material/Edit";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { FormControl, FormControlLabel, MenuItem, Radio, RadioGroup, Select } from "@mui/material";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import toast from "react-hot-toast";
import type { Session } from "next-auth";
import type {
  DataGetBalanceMyCashback,
  ResGetBalanceMyCashback,
} from "@/interfaces/userMyCashback";
import { BRAND_MINT_HEX } from "@/constants/brand";
import { profileLinkActionPillClass } from "@/features/profile/profileLinkPill";

export type ProfileExtendedForm = {
  username: string;
  birthdate: string;
  gender: string;
  idType: "national" | "passport";
  idNumber: string;
  address: string;
  country: string;
  state: string;
  city: string;
  zip: string;
};

const genderOptions = ["Male", "Female", "Other"];

function normalizeGenderValue(value?: string | null): string {
  if (!value || value === "unspecified") return "";
  return genderOptions.includes(value) ? value : "";
}

const inputOutlineSx = {
  " .MuiOutlinedInput-root": {
    borderRadius: "16px",
    minHeight: 56,
  },
  " .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(152, 152, 152, 0.4)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(152, 152, 152, 0.55)",
  },
};

const selectSx = {
  borderRadius: "16px",
  minHeight: 56,
  width: "100%",
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(152, 152, 152, 0.4)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(152, 152, 152, 0.55)",
  },
};

const radioSx = {
  color: "#989898",
  "&.Mui-checked": { color: "#00AA80" },
};

function maskMyCashbackPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 4) return `***${digits.slice(-4)}`;
  if (digits.length > 0) return "***";
  return "";
}

function maskMyCashbackEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at < 1) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const prefixLen = Math.min(4, local.length);
  return `${local.slice(0, prefixLen)}***@${domain}`;
}

function formatLinkedMyCashbackLabel(account: DataGetBalanceMyCashback): string {
  const phone = account.phoneNumber?.replace(/\s/g, "").trim() ?? "";
  if (phone.length > 0) {
    const masked = maskMyCashbackPhone(phone);
    return masked || "***";
  }
  const em = account.email?.trim() ?? "";
  if (em.length > 0) return maskMyCashbackEmail(em);
  return "•••";
}

const profileSocialIconSrc = {
  google: "/profile/social/google.svg",
  apple: "/profile/social/apple.svg",
  x: "/profile/social/x.svg",
  facebook: "/profile/social/facebook.svg",
  telegram: "/profile/social/telegram.svg",
  line: "/profile/social/line.svg",
} as const;

function ProfileSocialBrandIcon({ brand }: { brand: keyof typeof profileSocialIconSrc }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
      <Image
        src={profileSocialIconSrc[brand]}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 object-contain"
        unoptimized
      />
    </span>
  );
}

type SocialRowProps = {
  icon: ReactNode;
  label: string;
  onLink: () => void;
  linkLabel: string;
};

function SocialRow({ icon, label, onLink, linkLabel }: SocialRowProps) {
  return (
    <div className="flex h-12 min-h-[48px] flex-wrap items-center justify-between gap-2 rounded-full border border-[#e4e4e4] bg-white py-2 pl-3 pr-2">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {icon}
        <span className="truncate text-sm font-medium text-[#3b3b3b]">{label}</span>
      </div>
      <button type="button" onClick={onLink} className={profileLinkActionPillClass}>
        {linkLabel}
      </button>
    </div>
  );
}

type Props = {
  formData: ProfileExtendedForm;
  setFormData: Dispatch<SetStateAction<ProfileExtendedForm>>;
  loading: boolean;
  onSave: () => Promise<boolean>;
  session: Session | null;
  balanceMyCashback: ResGetBalanceMyCashback | undefined;
  /** When true (e.g. withdraw KYC deep-link), start in edit mode so ID/address fields are usable immediately */
  initialEditing?: boolean;
};

export const PROFILE_PERSONAL_INFORMATION_SECTION_ID = "profile-personal-information";

export default function ProfileDesktopPersonalPanel({
  formData,
  setFormData,
  loading,
  onSave,
  session,
  balanceMyCashback,
  initialEditing = false,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditing);

  const fieldsLocked = !isEditing;

  const handleEditOrSave = async () => {
    if (loading) return;
    if (fieldsLocked) {
      setIsEditing(true);
      return;
    }
    const ok = await onSave();
    if (ok) {
      setIsEditing(false);
    }
  };

  const emailDisplay =
    session?.user?.email && session.user.email !== "undefined" ? session.user.email : "";
  const phoneDisplay = session?.user?.mobile || balanceMyCashback?.user?.mobile || "";

  const hasLinkedMyCashback =
    Array.isArray(balanceMyCashback?.userMyCashback) && balanceMyCashback.userMyCashback.length > 0;

  const socialSoon = () => toast(t("authFeatureComingSoon"));

  return (
    <div
      id={PROFILE_PERSONAL_INFORMATION_SECTION_ID}
      className="flex w-full max-w-full scroll-mt-24 flex-col gap-8 rounded-3xl border border-[#e4e4e4] bg-white p-6 md:scroll-mt-28"
    >
      <div className="flex flex-col gap-6">
        <div className="flex w-full items-center justify-between gap-3">
          <h3 className="text-xl font-medium text-[#3b3b3b] md:text-2xl">
            {t("Personal Information")}
          </h3>
          <Button
            uiVariant={isEditing ? "primary" : "ghost"}
            uiSize="sm"
            disabled={loading}
            bgColor={isEditing ? BRAND_MINT_HEX : undefined}
            onClick={() => void handleEditOrSave()}
            sx={{
              ...(isEditing
                ? {
                    minHeight: "32px",
                    fontWeight: 600,
                    px: 2,
                    fontSize: "12px",
                    textTransform: "none",
                  }
                : {
                    border: `1px solid ${BRAND_MINT_HEX} !important`,
                    color: BRAND_MINT_HEX,
                    background: "transparent !important",
                    minHeight: "32px",
                    fontWeight: 500,
                    px: 2,
                    fontSize: "12px",
                  }),
            }}
          >
            {isEditing ? (
              <>
                {t("profileSave")}
                <SaveOutlined sx={{ ml: 0.5, fontSize: 16 }} />
              </>
            ) : (
              <>
                {t("Edit")}
                <Edit sx={{ ml: 0.5, fontSize: 14 }} />
              </>
            )}
          </Button>
        </div>

        <Input
          className="w-full"
          sx={inputOutlineSx}
          placeholder={t("profileFieldName")}
          value={
            formData.username ||
            (session?.user?.username && session.user.username !== "undefined"
              ? session.user.username
              : "") ||
            ""
          }
          onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
          disabled={fieldsLocked}
        />

        <FormControl disabled={fieldsLocked}>
          <RadioGroup
            row
            className="gap-6 md:gap-10"
            value={formData.idType}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                idType: e.target.value as ProfileExtendedForm["idType"],
              }))
            }
          >
            <FormControlLabel
              value="national"
              control={<Radio sx={radioSx} size="small" />}
              label={t("profileNationalId")}
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 16, color: "#3b3b3b" } }}
            />
            <FormControlLabel
              value="passport"
              control={<Radio sx={radioSx} size="small" />}
              label={t("profilePassportId")}
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 16, color: "#3b3b3b" } }}
            />
          </RadioGroup>
        </FormControl>

        <Input
          className="w-full"
          sx={inputOutlineSx}
          placeholder={t("profileCitizenOrPassportId")}
          value={formData.idNumber}
          onChange={(e) => setFormData((p) => ({ ...p, idNumber: e.target.value }))}
          disabled={fieldsLocked}
        />

        <Input
          className="w-full"
          sx={inputOutlineSx}
          placeholder={t("profileLegalAddress")}
          value={formData.address}
          onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
          disabled={fieldsLocked}
        />

        <div className="flex flex-col gap-3">
          <h4 className="text-base font-semibold leading-snug text-[#3b3b3b]">
            {t("profileLocationSectionHeading")}
          </h4>
          <div className="rounded-2xl border border-[#e4e4e4] bg-[#fafafa] p-4 md:p-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="profile-location-country"
                  className="text-sm font-medium text-[#3b3b3b]"
                >
                  {t("profileCountry")}
                </label>
                <Select
                  id="profile-location-country"
                  displayEmpty
                  value={formData.country}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                  sx={selectSx}
                  disabled={fieldsLocked}
                  inputProps={{ "aria-label": t("profileCountry") }}
                >
                  <MenuItem value="">
                    <span className="text-[#7f7f7f]">{t("profileCountry")}</span>
                  </MenuItem>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="profile-location-state"
                  className="text-sm font-medium text-[#3b3b3b]"
                >
                  {t("profileState")}
                </label>
                <Select
                  id="profile-location-state"
                  displayEmpty
                  value={formData.state}
                  onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))}
                  sx={selectSx}
                  disabled={fieldsLocked}
                  inputProps={{ "aria-label": t("profileState") }}
                >
                  <MenuItem value="">
                    <span className="text-[#7f7f7f]">{t("profileState")}</span>
                  </MenuItem>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="profile-location-city"
                  className="text-sm font-medium text-[#3b3b3b]"
                >
                  {t("profileCity")}
                </label>
                <Select
                  id="profile-location-city"
                  displayEmpty
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  sx={selectSx}
                  disabled={fieldsLocked}
                  inputProps={{ "aria-label": t("profileCity") }}
                >
                  <MenuItem value="">
                    <span className="text-[#7f7f7f]">{t("profileCity")}</span>
                  </MenuItem>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="profile-location-zip"
                  className="text-sm font-medium text-[#3b3b3b]"
                >
                  {t("profileZipCode")}
                </label>
                <Input
                  id="profile-location-zip"
                  className="w-full"
                  sx={inputOutlineSx}
                  placeholder={t("profileZipCode")}
                  value={formData.zip}
                  onChange={(e) => setFormData((p) => ({ ...p, zip: e.target.value }))}
                  disabled={fieldsLocked}
                  inputProps={{ "aria-label": t("profileZipCode") }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex w-full flex-col gap-1">
            <Link
              href="/profile/info"
              className="text-right text-sm font-normal text-[#0064D6] no-underline hover:underline"
            >
              {t("profileLinkEmail")}
            </Link>
            <Input
              className="w-full"
              sx={inputOutlineSx}
              placeholder={t("profileEmailPlaceholder")}
              value={emailDisplay}
              disabled
            />
          </div>
          <div className="flex w-full flex-col gap-1">
            <button
              type="button"
              onClick={() => router.push("/profile/verify-phone")}
              className="text-right text-sm font-normal text-[#0064D6] hover:underline"
            >
              {t("profileLinkPhoneNumber")}
            </button>
            <Input
              className="w-full"
              sx={inputOutlineSx}
              placeholder={t("profilePhonePlaceholder")}
              value={phoneDisplay}
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            displayEmpty
            value={normalizeGenderValue(formData.gender || session?.user?.gender)}
            onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
            sx={selectSx}
            disabled={fieldsLocked}
            renderValue={(selected) => {
              if (selected === "" || selected == null) {
                return <span className="text-[#7f7f7f]">{t("profileGenderOptional")}</span>;
              }
              return selected;
            }}
          >
            <MenuItem value="">
              <span className="text-[#7f7f7f]">{t("profileGenderOptional")}</span>
            </MenuItem>
            {genderOptions.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
          <Input
            type="date"
            className="w-full"
            sx={inputOutlineSx}
            placeholder={t("profileBirthDate")}
            value={formData.birthdate || session?.user?.birthdate || ""}
            onChange={(e) => setFormData((p) => ({ ...p, birthdate: e.target.value }))}
            disabled={fieldsLocked}
          />
        </div>

        <p className="text-sm leading-normal text-[#7f7f7f]">{t("profilePrivacyDisclaimer")}</p>
      </div>

      <div className="flex flex-col gap-4 border-t border-[#e4e4e4] border-t-[0.5px] pt-6">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <p className="text-base font-medium leading-normal text-[#3b3b3b] sm:min-w-0 sm:flex-1">
              {t("profileMyCashbackQuestion")}
            </p>
            <Link
              href="/link-mycashback"
              className="shrink-0 border-b border-solid border-[#0064D6] text-base font-medium leading-normal text-[#0064D6] no-underline"
            >
              {t("profileMyCashbackLinkCta")}
            </Link>
          </div>
          <p className="text-sm leading-normal text-[#7f7f7f]">
            {t("profileMyCashbackMultipleAccountsDescription")}
          </p>
        </div>
        {hasLinkedMyCashback && balanceMyCashback?.userMyCashback?.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list">
            {balanceMyCashback.userMyCashback.map((acc) => (
              <li
                key={acc._id}
                className="flex min-h-[56px] items-center rounded-2xl border border-[rgba(152,152,152,0.4)] px-4 py-3"
              >
                <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-base font-normal text-[#3b3b3b]">
                    <span className="shrink-0 whitespace-nowrap">MyCashBack</span>
                    <span className="min-w-0 truncate">{formatLinkedMyCashbackLabel(acc)}</span>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                    <button
                      type="button"
                      disabled
                      className={`${profileLinkActionPillClass} cursor-default opacity-100 disabled:opacity-100`}
                      aria-label={t("profileMyCashbackLinkedButton")}
                    >
                      {t("profileMyCashbackLinkedButton")}
                    </button>
                    <button
                      type="button"
                      onClick={() => toast(t("authFeatureComingSoon"))}
                      className="text-xs font-medium text-[#0064D6] underline decoration-solid underline-offset-2"
                    >
                      {t("profileMyCashbackUnlink")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 border-t border-[#e4e4e4] pt-6">
        <h4 className="text-xl font-medium text-[#3b3b3b]">{t("profileSocialHeading")}</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SocialRow
            icon={<ProfileSocialBrandIcon brand="google" />}
            label={t("profileLinkWithGmail")}
            linkLabel={t("profileSocialLink")}
            onLink={socialSoon}
          />
          <SocialRow
            icon={<ProfileSocialBrandIcon brand="facebook" />}
            label={t("profileLinkWithFacebook")}
            linkLabel={t("profileSocialLink")}
            onLink={socialSoon}
          />
          <SocialRow
            icon={<ProfileSocialBrandIcon brand="line" />}
            label={t("profileLinkWithLine")}
            linkLabel={t("profileSocialLink")}
            onLink={socialSoon}
          />
          <SocialRow
            icon={<ProfileSocialBrandIcon brand="x" />}
            label={t("profileLinkWithX")}
            linkLabel={t("profileSocialLink")}
            onLink={socialSoon}
          />
          <SocialRow
            icon={<ProfileSocialBrandIcon brand="telegram" />}
            label={t("profileLinkWithTelegram")}
            linkLabel={t("profileSocialLink")}
            onLink={socialSoon}
          />
          <SocialRow
            icon={<ProfileSocialBrandIcon brand="apple" />}
            label={t("profileLinkWithApple")}
            linkLabel={t("profileSocialLink")}
            onLink={socialSoon}
          />
        </div>
      </div>
    </div>
  );
}
