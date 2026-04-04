"use client";

import {
  DataMethodWithdraw,
  RequestCreateMethodWithdraw,
  ResponseBankList,
  ResponseCreateMethodWithdraw,
} from "@/interfaces/withdraw";
import { fetcher } from "@/lib/axios/client";
import { Autocomplete, InputAdornment, styled, Switch, TextField } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import SubPage from "../layout/SubPage";
import Input from "@/components/common/Input";
import React, { useMemo, useRef, useState } from "react";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import DialpadIcon from "@mui/icons-material/Dialpad";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import toast from "react-hot-toast";
import { createMethodWithdraw, updateMethodWithdraw } from "@/lib/services/withdraw";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type MethodTab = "promptpay" | "bank" | "crypto";

type PromptPayIdType = "phone" | "citizen";

const fieldOutlineSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    minHeight: 56,
    paddingLeft: "16px",
    "& fieldset": {
      borderColor: "rgba(152, 152, 152, 0.4)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(152, 152, 152, 0.55)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#00AA80",
      borderWidth: "1px",
    },
  },
} as const;

const AntSwitch = styled(Switch)(({ theme }) => ({
  width: 36,
  height: 20,
  padding: 0,
  display: "flex",
  "&:active": {
    "& .MuiSwitch-thumb": {
      width: 16,
    },
    "& .MuiSwitch-switchBase.Mui-checked": {
      transform: "translateX(14px)",
    },
  },
  "& .MuiSwitch-switchBase": {
    padding: 2,
    "&.Mui-checked": {
      transform: "translateX(16px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: "#00CC99",
        ...theme.applyStyles("dark", {
          backgroundColor: "#00CC99",
        }),
      },
    },
  },
  "& .MuiSwitch-thumb": {
    boxShadow: "0 2px 4px 0 rgb(0 35 11 / 20%)",
    width: 16,
    height: 16,
    borderRadius: 8,
    transition: theme.transitions.create(["width"], {
      duration: 200,
    }),
  },
  "& .MuiSwitch-track": {
    borderRadius: 20 / 2,
    opacity: 1,
    backgroundColor: "#f0f0f0",
    boxSizing: "border-box",
    ...theme.applyStyles("dark", {
      backgroundColor: "rgba(255,255,255,.35)",
    }),
  },
}));

/** Mobile: ≥48px min height, padded full-width row for thumb-friendly tap targets; desktop stays compact. */
const DEFAULT_SWITCH_ROW_CLASS =
  "flex max-w-full cursor-pointer touch-manipulation items-center gap-4 self-start transition-colors max-md:w-full max-md:min-h-12 max-md:rounded-2xl max-md:border max-md:border-[var(--gc-border)] max-md:bg-[#f9f9f9] max-md:px-4 max-md:py-3 max-md:active:bg-[#f0f0f0] md:min-h-0 md:w-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:active:bg-transparent";

type FormProps = {
  methodId: string | null;
  initialForm: RequestCreateMethodWithdraw;
};

export function CreateMethodWithdrawForm({ methodId, initialForm }: FormProps) {
  const t = useTranslations();
  const router = useRouter();
  /** Default Bank per Figma `9075:128780` (Add withdrawal methods — Bank Account selected). */
  const [methodTab, setMethodTab] = useState<MethodTab>("bank");
  const [form, setForm] = useState<RequestCreateMethodWithdraw>(() => initialForm);
  const [ppIdType, setPpIdType] = useState<PromptPayIdType>("phone");
  const [ppCode, setPpCode] = useState("");
  const [ppThaiName, setPpThaiName] = useState("");
  const [ppEnglishName, setPpEnglishName] = useState("");
  const [ppIsDefault, setPpIsDefault] = useState(false);
  const [ppQrFileName, setPpQrFileName] = useState<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState("");
  const [cryptoIsDefault, setCryptoIsDefault] = useState(false);

  const { data: banks } = useQuery<ResponseBankList[]>({
    queryKey: ["ResponseBankList"],
    queryFn: () => fetcher(`/withdraw/banks`),
  });

  const isFormValid = useMemo(
    () => Boolean(form.bank_name && form.account_name && form.account_no && form.bank_code),
    [form.account_name, form.account_no, form.bank_code, form.bank_name]
  );

  const isPromptPayValid = useMemo(
    () => Boolean(ppCode.trim() && ppThaiName.trim() && ppEnglishName.trim()),
    [ppCode, ppEnglishName, ppThaiName]
  );

  const promptPayPayload = useMemo((): RequestCreateMethodWithdraw => {
    const suffix = ppIdType === "phone" ? " (Phone)" : " (Citizen ID)";
    return {
      account_no: ppCode.trim(),
      account_name: `${ppThaiName.trim()} | ${ppEnglishName.trim()}${suffix}`,
      bank_name: "PromptPay",
      bank_code: ppIdType === "phone" ? "PP_PHONE" : "PP_CITIZEN",
      is_default: ppIsDefault,
    };
  }, [ppCode, ppEnglishName, ppIdType, ppIsDefault, ppThaiName]);

  const isCryptoWalletValid = useMemo(
    () => Boolean(cryptoWalletAddress.trim()),
    [cryptoWalletAddress]
  );

  const cryptoWalletPayload = useMemo((): RequestCreateMethodWithdraw => {
    return {
      account_no: cryptoWalletAddress.trim(),
      account_name: "Crypto Wallet",
      bank_name: "Crypto Wallet",
      bank_code: "CRYPTO",
      is_default: cryptoIsDefault,
    };
  }, [cryptoIsDefault, cryptoWalletAddress]);

  const { isPending: loadingCreateMethodWithdraw, mutateAsync: mutateCreateMethodWithdraw } =
    useMutation({
      mutationKey: ["CreateMethodWithdraw"],
      mutationFn: createMethodWithdraw,
      onSuccess(data: ResponseCreateMethodWithdraw) {
        if (data.status === "success") {
          toast.success(data.message);
          router.push("/method");
        }
      },
      onError(_error: { data?: { message?: string } }) {
        toast.error(_error?.data?.message || "Failed to create withdrawal method");
      },
    });

  const { isPending: loadingUpdateMethodWithdraw, mutateAsync: mutateUpdateMethodWithdraw } =
    useMutation({
      mutationKey: ["UpdateMethodWithdraw"],
      mutationFn: updateMethodWithdraw,
      onSuccess(data: DataMethodWithdraw) {
        if (data._id) {
          toast.success("Withdrawal method updated successfully");
          router.push("/method");
        }
      },
      onError(_error: { data?: { message?: string } }) {
        toast.error(_error?.data?.message || "Failed to update withdrawal method");
      },
    });

  const busy = loadingCreateMethodWithdraw || loadingUpdateMethodWithdraw;

  const tabClass = (tab: MethodTab) =>
    [
      "box-border flex min-h-[81px] w-[142px] shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-solid px-11 py-2 transition-colors",
      methodTab === tab
        ? "border-[#00AA80] bg-[#ebf8f5]"
        : "border-[#e4e4e4] bg-white hover:border-[#cfcfcf]",
    ].join(" ");

  const ppRadioOuter = (active: boolean) =>
    [
      "flex size-6 shrink-0 items-center justify-center rounded-full border border-solid",
      active ? "border-[#00AA80]" : "border-[#989898]",
    ].join(" ");

  const ppRadioInner = (active: boolean) =>
    active ? "size-4 rounded-full bg-[#00AA80]" : "size-4 rounded-full bg-transparent";

  const tabLabelClass = (tab: MethodTab) =>
    methodTab === tab ? "text-xs font-normal text-[#00AA80]" : "text-xs font-normal text-[#7f7f7f]";

  const tabIconClass = (tab: MethodTab) =>
    methodTab === tab ? "text-[#00AA80]" : "text-[#7f7f7f]";

  return (
    <SubPage title="Withdraw Method" showSubMenu>
      <div className="flex w-full max-w-[720px] flex-col gap-6">
        <h2 className="text-[22px] font-semibold leading-normal text-black md:text-2xl">
          {t("withdrawMethodAddPageTitle")}
        </h2>

        <div className="flex flex-wrap items-start gap-4">
          <button
            type="button"
            className={tabClass("promptpay")}
            onClick={() => setMethodTab("promptpay")}
          >
            <DialpadIcon className={tabIconClass("promptpay")} sx={{ fontSize: 24 }} />
            <span className={tabLabelClass("promptpay")}>{t("withdrawMethodTabPromptPay")}</span>
          </button>
          <button type="button" className={tabClass("bank")} onClick={() => setMethodTab("bank")}>
            <AccountBalanceIcon className={tabIconClass("bank")} sx={{ fontSize: 24 }} />
            <span className={tabLabelClass("bank")}>{t("withdrawMethodFormBankAccount")}</span>
          </button>
          <button
            type="button"
            className={tabClass("crypto")}
            onClick={() => setMethodTab("crypto")}
          >
            <AccountBalanceWalletIcon className={tabIconClass("crypto")} sx={{ fontSize: 24 }} />
            <span className={tabLabelClass("crypto")}>{t("withdrawMethodTabCryptoWallet")}</span>
          </button>
        </div>

        {methodTab === "promptpay" ? (
          <>
            <div className="flex flex-col gap-4">
              <p className="text-lg font-normal leading-normal text-[#3b3b3b]">
                {t("withdrawMethodSectionPromptPayTitle")}
              </p>

              <div
                className="flex flex-wrap items-center gap-x-10 gap-y-2"
                role="radiogroup"
                aria-label={t("withdrawMethodSectionPromptPayTitle")}
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    className="sr-only"
                    checked={ppIdType === "phone"}
                    onChange={() => setPpIdType("phone")}
                  />
                  <span className={ppRadioOuter(ppIdType === "phone")} aria-hidden>
                    <span className={ppRadioInner(ppIdType === "phone")} />
                  </span>
                  <span className="text-base font-normal text-[#3b3b3b]">
                    {t("withdrawMethodPromptPayIdPhone")}
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    className="sr-only"
                    checked={ppIdType === "citizen"}
                    onChange={() => setPpIdType("citizen")}
                  />
                  <span className={ppRadioOuter(ppIdType === "citizen")} aria-hidden>
                    <span className={ppRadioInner(ppIdType === "citizen")} />
                  </span>
                  <span className="text-base font-normal text-[#3b3b3b]">
                    {t("withdrawMethodPromptPayIdCitizen")}
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <Input
                  className="w-full"
                  sx={{ ...fieldOutlineSx }}
                  value={ppCode}
                  placeholder={t("withdrawMethodPromptPayCodePlaceholder")}
                  onChange={(e) => setPpCode(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DialpadIcon sx={{ fontSize: 16, opacity: 0.4, color: "#7f7f7f" }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Input
                  className="w-full"
                  sx={{ ...fieldOutlineSx }}
                  value={ppThaiName}
                  placeholder={t("withdrawMethodPromptPayThaiNamePlaceholder")}
                  onChange={(e) => setPpThaiName(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <span className="text-base leading-none opacity-90" aria-hidden>
                          🇹🇭
                        </span>
                      </InputAdornment>
                    ),
                  }}
                />
                <Input
                  className="w-full"
                  sx={{ ...fieldOutlineSx }}
                  value={ppEnglishName}
                  placeholder={t("withdrawMethodPromptPayEnglishNamePlaceholder")}
                  onChange={(e) => setPpEnglishName(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <span className="text-base leading-none opacity-90" aria-hidden>
                          🇬🇧
                        </span>
                      </InputAdornment>
                    ),
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={qrInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPpQrFileName(f ? f.name : null);
                  }}
                />
                <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-solid border-[#e4e4e4] bg-white px-4 py-4">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-normal text-[#7f7f7f]">
                      {t("withdrawMethodPromptPayAttachQrLabel")}
                    </span>
                    {ppQrFileName ? (
                      <span className="truncate text-sm font-normal text-[#3b3b3b]">
                        {ppQrFileName}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-2 text-base font-medium text-[#00CC99] transition-opacity hover:opacity-90"
                    onClick={() => qrInputRef.current?.click()}
                  >
                    {t("withdrawMethodPromptPayAttachQrAdd")}
                    <AddBoxOutlinedIcon sx={{ fontSize: 16, color: "#00CC99" }} />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-sm font-normal leading-relaxed text-[#7f7f7f]">
              {t("withdrawMethodPrivacyDisclaimer")}
            </p>

            <label className={DEFAULT_SWITCH_ROW_CLASS}>
              <AntSwitch
                checked={ppIsDefault}
                inputProps={{ "aria-label": t("withdrawMethodDefaultSwitchAria") }}
                onChange={(e) => setPpIsDefault(e.target.checked)}
              />
              <span className="text-base font-normal text-black">
                {t("withdrawMethodFormSetAsDefault")}
              </span>
            </label>

            <div className="flex w-full flex-wrap items-start justify-end gap-6 max-md:flex-nowrap max-md:justify-between max-md:gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => router.push("/method")}
                className="flex h-[52px] w-[200px] max-h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-[#00CC99] bg-white px-6 py-3 text-base font-medium text-[#00CC99] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 max-md:min-w-0 max-md:w-auto max-md:flex-1 max-md:shrink"
              >
                {t("linkMyCashbackMethodBack")}
              </button>
              <button
                type="button"
                disabled={busy || !isPromptPayValid || Boolean(methodId)}
                onClick={() => {
                  if (!isPromptPayValid || methodId) return;
                  void mutateCreateMethodWithdraw(promptPayPayload);
                }}
                className={`flex h-[52px] w-[200px] max-h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-base font-medium transition-opacity max-md:min-w-0 max-md:w-auto max-md:flex-1 max-md:shrink ${
                  isPromptPayValid && !busy && !methodId
                    ? "bg-[#00CC99] text-white hover:opacity-95"
                    : "cursor-not-allowed bg-[#f6f6f6] text-[#989898]"
                }`}
              >
                {t("withdrawMethodFormSave")}
              </button>
            </div>
          </>
        ) : methodTab === "bank" ? (
          <>
            <div className="flex flex-col gap-4">
              <p className="text-lg font-normal leading-normal text-[#3b3b3b]">
                {t("withdrawMethodSectionBankTitle")}
              </p>

              <Autocomplete
                id="find-bank"
                options={banks?.map((bank) => `${bank.nameEn}`) || []}
                value={form.bank_name || null}
                onChange={(_, value) => {
                  const details = banks?.find((bank) => bank.nameEn === value);
                  setForm({
                    ...form,
                    bank_name: value || "",
                    bank_code: details?.code || "",
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={t("withdrawMethodFormSelectBankPlaceholder")}
                    sx={{ ...fieldOutlineSx }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <AccountBalanceIcon
                              sx={{ fontSize: 16, opacity: 0.4, color: "#7f7f7f" }}
                            />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              <Input
                className="w-full"
                sx={{ ...fieldOutlineSx }}
                value={form.account_no}
                placeholder={t("withdrawMethodFormBankAccountPlaceholder")}
                onChange={(e) => {
                  setForm({ ...form, account_no: e.target.value });
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CreditCardOutlinedIcon
                        sx={{ fontSize: 16, opacity: 0.4, color: "#7f7f7f" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              <Input
                className="w-full"
                sx={{ ...fieldOutlineSx }}
                value={form.account_name}
                placeholder={t("withdrawMethodFormAccountNamePlaceholder")}
                onChange={(e) => {
                  setForm({ ...form, account_name: e.target.value });
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineOutlinedIcon
                        sx={{ fontSize: 16, opacity: 0.4, color: "#7f7f7f" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            <p className="text-sm font-normal leading-relaxed text-[#7f7f7f]">
              {t("withdrawMethodPrivacyDisclaimer")}
            </p>

            <label className={DEFAULT_SWITCH_ROW_CLASS}>
              <AntSwitch
                checked={form.is_default}
                inputProps={{ "aria-label": t("withdrawMethodDefaultSwitchAria") }}
                onChange={(e) => {
                  setForm({ ...form, is_default: e.target.checked });
                }}
              />
              <span className="text-base font-normal text-black">
                {t("withdrawMethodFormSetAsDefault")}
              </span>
            </label>

            <div className="flex w-full flex-wrap items-start justify-end gap-6 max-md:flex-nowrap max-md:justify-between max-md:gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => router.push("/method")}
                className="flex h-[52px] w-[200px] max-h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-[#00CC99] bg-white px-6 py-3 text-base font-medium text-[#00CC99] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 max-md:min-w-0 max-md:w-auto max-md:flex-1 max-md:shrink"
              >
                {t("linkMyCashbackMethodBack")}
              </button>
              <button
                type="button"
                disabled={busy || !isFormValid}
                onClick={() => {
                  if (!isFormValid) return;
                  if (methodId) {
                    void mutateUpdateMethodWithdraw({ ...form, _id: methodId });
                  } else {
                    void mutateCreateMethodWithdraw(form);
                  }
                }}
                className={`flex h-[52px] w-[200px] max-h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-base font-medium transition-opacity max-md:min-w-0 max-md:w-auto max-md:flex-1 max-md:shrink ${
                  isFormValid && !busy
                    ? "bg-[#00CC99] text-white hover:opacity-95"
                    : "cursor-not-allowed bg-[#f6f6f6] text-[#989898]"
                }`}
              >
                {t("withdrawMethodFormSave")}
              </button>
            </div>
          </>
        ) : methodTab === "crypto" ? (
          <>
            <div className="flex flex-col gap-4">
              <p className="text-lg font-normal leading-normal text-[#3b3b3b]">
                {t("withdrawMethodSectionCryptoTitle")}
              </p>

              <Input
                className="w-full"
                sx={{ ...fieldOutlineSx }}
                value={cryptoWalletAddress}
                placeholder={t("withdrawMethodCryptoWalletPlaceholder")}
                onChange={(e) => setCryptoWalletAddress(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CreditCardOutlinedIcon
                        sx={{ fontSize: 16, opacity: 0.4, color: "#7f7f7f" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            <p className="text-sm font-normal leading-relaxed text-[#7f7f7f]">
              {t("withdrawMethodPrivacyDisclaimer")}
            </p>

            <label className={DEFAULT_SWITCH_ROW_CLASS}>
              <AntSwitch
                checked={cryptoIsDefault}
                inputProps={{ "aria-label": t("withdrawMethodDefaultSwitchAria") }}
                onChange={(e) => setCryptoIsDefault(e.target.checked)}
              />
              <span className="text-base font-normal text-black">
                {t("withdrawMethodFormSetAsDefault")}
              </span>
            </label>

            <div className="flex w-full flex-wrap items-start justify-end gap-6 max-md:flex-nowrap max-md:justify-between max-md:gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => router.push("/method")}
                className="flex h-[52px] w-[200px] max-h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-[#00CC99] bg-white px-6 py-3 text-base font-medium text-[#00CC99] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 max-md:min-w-0 max-md:w-auto max-md:flex-1 max-md:shrink"
              >
                {t("linkMyCashbackMethodBack")}
              </button>
              <button
                type="button"
                disabled={busy || !isCryptoWalletValid || Boolean(methodId)}
                onClick={() => {
                  if (!isCryptoWalletValid || methodId) return;
                  void mutateCreateMethodWithdraw(cryptoWalletPayload);
                }}
                className={`flex h-[52px] w-[200px] max-h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full px-6 py-3 text-base font-medium transition-opacity max-md:min-w-0 max-md:w-auto max-md:flex-1 max-md:shrink ${
                  isCryptoWalletValid && !busy && !methodId
                    ? "bg-[#00CC99] text-white hover:opacity-95"
                    : "cursor-not-allowed bg-[#f6f6f6] text-[#989898]"
                }`}
              >
                {t("withdrawMethodFormSave")}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </SubPage>
  );
}
