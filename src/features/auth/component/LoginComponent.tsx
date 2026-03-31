"use client";

import { env } from "@/env";
import useFirebaseLogin from "@/hooks/useFirebaseLogin";
import { OptionsCountries, ResponseCountry } from "@/interfaces/country";
import { Autocomplete, Box, Dialog, Paper, TextField } from "@mui/material";
import type { PaperProps } from "@mui/material/Paper";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { forwardRef, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useMemo } from "react";
import ButtonLogin from "../common/ButtonLogin";
import SocialAuthTile from "../common/SocialAuthTile";
import { usePathname, useRouter } from "@/i18n/navigation";
import TelegramLogin from "../common/TelegramLogin";
import { AuthPrivacyConsentField } from "./AuthPrivacyConsentField";
import { PhoneOtpSixBoxes } from "./PhoneOtpSixBoxes";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { LogoMark } from "@/components/brand/LogoMark";
import client from "@/lib/axios/client";
import { getTelegramOAuthBotId } from "@/lib/env";
import { countryCodeToFlagEmoji } from "@/lib/countries/flagEmoji";
import { signIn } from "next-auth/react";
import { IResponseLogin } from "@/interfaces/auth";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  getAppLocale,
  getPostHogAnonymousId,
  getPostHogDistinctId,
  POSTHOG_FLAG_KEYS,
  usePostHogFlagPayload,
} from "@/lib/posthog";
import { trackMetaCompleteRegistration } from "@/lib/metaPixel";
import {
  DEV_PHONE_CREDENTIAL_JWT,
  devPhoneMockExpectedOtp,
  isDevPhoneAuthEnabled,
  isDevPhoneMagicLocalDigits,
} from "@/lib/dev/phoneAuthMock";
import { mockSignInUser } from "@/mocks/auth/signInMockData";
import { resolvePostLoginHref } from "@/lib/auth/postLoginRedirect";
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onTelegramAuth: (user: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Telegram: any;
  }
}

type SocialAuthTileSpec = {
  key: string;
  label: string;
  onClick: () => void;
  iconSrc: string;
};

/** Set by LoginComponent before rendering Autocomplete so the open menu matches Figma “choice” panel. */
const authCountryMenuHeaderRef: { current: OptionsCountries | null } = { current: null };

const AuthCountryMenuPaper = forwardRef<HTMLDivElement, PaperProps>(
  function AuthCountryMenuPaper(props, ref) {
    const { sx, children, ...other } = props;
    const header = authCountryMenuHeaderRef.current;
    const headerFlag = header ? countryCodeToFlagEmoji(header.code) : "";
    const sxArray = Array.isArray(sx) ? sx : sx != null ? [sx] : [];

    return (
      <Paper
        ref={ref}
        elevation={0}
        {...other}
        sx={[
          {
            mt: "4px",
            borderRadius: "16px",
            border: "1px solid #E4E4E4",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
            overflow: "hidden",
            p: 0,
            bgcolor: "#fff",
          },
          ...sxArray,
        ]}
      >
        {header ? (
          <Box
            aria-hidden
            sx={{
              bgcolor: "#00AA80",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1.25,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
            {headerFlag ? (
              <Box
                component="span"
                sx={{
                  fontSize: 18,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {headerFlag}
              </Box>
            ) : null}
            {header.label}
          </Box>
        ) : null}
        {children}
      </Paper>
    );
  }
);

const LoginComponent = () => {
  const { handleLoginGoogle, handleLoginX, setSelectCountry, selectCountry, handleLoginFacebook } =
    useFirebaseLogin();
  const router = useRouter();
  const t = useTranslations();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const [showUpdateEmail, setShowUpdateEmail] = useState(false);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [phoneAuthPhase, setPhoneAuthPhase] = useState<"idle" | "otp">("idle");
  const [phoneOtpInput, setPhoneOtpInput] = useState("");
  const [phoneOtpError, setPhoneOtpError] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const onboardingExperiment = usePostHogFlagPayload<{
    title?: string;
    description?: string;
    google_label?: string;
    x_label?: string;
    telegram_label?: string;
  }>(POSTHOG_FLAG_KEYS.onboardingRegistration, {});

  const params = useSearchParams();
  const referral_id = params.get("referral_id");
  const { data: countries } = useQuery<ResponseCountry[]>({
    queryKey: ["/api/countries"],
    queryFn: () => axios.get("/api/countries").then((res) => res.data),
    staleTime: Infinity,
  });

  const listCountries = useMemo<OptionsCountries[]>(() => {
    return countries && countries?.length > 0
      ? countries?.map((country: ResponseCountry) => ({
          label: country.name.common,
          code: country.cca2,
          value: country.name.common,
        }))
      : [];
  }, [countries]);

  const dialCode = useMemo(() => {
    const code = selectCountry?.code ?? "TH";
    if (code === "US") return "+1";
    if (code === "KR") return "+82";
    if (code === "TW") return "+886";
    return "+66";
  }, [selectCountry]);

  const phoneDigits = phoneLocal.replace(/\D/g, "");
  const canSubmitPhone = privacyAccepted && phoneDigits.length >= 9;
  const devPhoneFlow = isDevPhoneAuthEnabled() && isDevPhoneMagicLocalDigits(phoneDigits);

  useEffect(() => {
    if (phoneAuthPhase !== "otp") return undefined;
    const id = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phoneAuthPhase]);

  const requestPhoneOtp = useCallback(() => {
    const e164 = `${dialCode}${phoneDigits}`;
    client.post("/auth/send-otp", { phone: e164 }).catch(() => {});
    if (isDevPhoneAuthEnabled() && isDevPhoneMagicLocalDigits(phoneDigits)) {
      toast.success(t("authPhoneDevOtpSent"));
    } else {
      toast.success(t("authPhoneOtpRequestSuccess"));
    }
  }, [dialCode, phoneDigits, t]);

  const phoneMaskedTail = phoneDigits.length >= 4 ? `***${phoneDigits.slice(-4)}` : "****";

  const formatOtpCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `(${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")})`;
  };

  function loginWithTelegram() {
    const botId = getTelegramOAuthBotId();
    const endpoint = env.NEXT_PUBLIC_FRONTEND_URL;
    // const redirectUrl = encodeURIComponent(`${endpoint}/api/telegram`);
    const redirectUrl = `${endpoint}/login`;

    window.location.href =
      `https://oauth.telegram.org/auth?bot_id=${botId}` +
      `&origin=${endpoint}` +
      `&return_to=${redirectUrl}` +
      `&request_access=write`;
  }

  const checkHasAcc = (telegramId: string) => {
    client.get(`/auth/check-account-telegram/${telegramId}`).then((response) => {
      const data = response.data;
      if (!data) {
        setShowUpdateEmail(true);
      }
    });
  };

  useEffect(() => {
    if (params.get("id")) {
      checkHasAcc(params.get("id") || "");
    }
  }, [params]);

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash.startsWith("#tgAuthResult=")) return;

    const encoded = hash.replace("#tgAuthResult=", "");
    const telegramData = JSON.parse(atob(encoded));

    checkHasAcc(telegramData.id);
  }, []);

  const handleLoginTelegram = async () => {
    const id = params.get("id");
    const firstName = params.get("first_name");
    const username = params.get("username");
    const photoUrl = params.get("photo_url");
    const authDate = params.get("auth_date");
    const hash = params.get("hash");
    const dataTelegram = { id, firstName, username, photoUrl, authDate, hash };
    // // ส่งไป API
    // Implement login logic here using dataTelegram
    const res = await client
      .post<IResponseLogin>(`/auth/log-in/telegram`, {
        ...dataTelegram,
        email,
        referral_id,
        country: selectCountry?.label || "Thailand",
      })
      .then((response) => response.data);

    if (res) {
      try {
        const signResult = await signIn("firebase", {
          jwt: res.token,
          email: res.user.email,
          referral_id,
          country: selectCountry?.label || "Thailand",
          pathname,
          type: "telegram",
          locale: getAppLocale(),
          posthog_distinct_id: getPostHogDistinctId(),
          posthog_anonymous_id: getPostHogAnonymousId(),
          auth_flow: res.auth_flow || "login",
          is_new_user: String(Boolean(res.is_new_user)),
          callbackUrl: "/",
          redirect: false,
        });
        if (signResult?.ok) {
          window.sessionStorage.setItem("showModalAfterLogin", "true");
          router.push(await resolvePostLoginHref("social"));
        } else {
          toast.error(t("authPhoneDevLoginFailed"));
        }
      } catch {
        toast.error(t("authPhoneDevLoginFailed"));
      }
    }
  };

  // const isTelegramBrowser = () => {
  //   return window?.Telegram;
  // };

  const onSendCodeEmail = () => {
    client
      .post("/auth/send-otp", {
        email,
      })
      .then(() => {
        // Handle success, e.g., show a message to the user
        toast.success("Verification code sent to your email. Please check your inbox.");
      })
      .catch(() => {
        toast.error("Failed to send verification code. Please try again.");
        // Handle error, e.g., show an error message to the user
      });
  };

  const onVerifyCode = () => {
    client
      .post("/auth/verify-otp", {
        email,
        otp: verifyCode,
      })
      .then(() => {
        // Handle success, e.g., show a message to the user
        // toast.success("Verification code verified successfully.");
        handleLoginTelegram();
      })
      .catch(() => {
        toast.error("Failed to verify code. Please try again.");
        // Handle error, e.g., show an error message to the user
      });
  };

  const completeDevPhoneSignIn = async () => {
    const mobileSnapshot = `${dialCode}${phoneDigits}`;
    let response: Awaited<ReturnType<typeof signIn>>;
    try {
      response = await signIn("firebase", {
        jwt: DEV_PHONE_CREDENTIAL_JWT,
        type: "dev_phone",
        email: mockSignInUser.email,
        mobile_snapshot: mobileSnapshot,
        referral_id: referral_id ?? "",
        country: selectCountry?.label || "Thailand",
        pathname,
        locale: getAppLocale(),
        posthog_distinct_id: getPostHogDistinctId() || "",
        posthog_anonymous_id: getPostHogAnonymousId() || "",
        auth_flow: pathname?.includes("/register") ? "register" : "login",
        callbackUrl: "/",
        redirect: false,
      });
    } catch {
      toast.error(t("authPhoneDevLoginFailed"));
      return;
    }
    if (!response?.ok) {
      toast.error(t("authPhoneDevLoginFailed"));
      return;
    }
    if (pathname?.includes("/register")) {
      trackMetaCompleteRegistration({ status: true });
    }
    window.sessionStorage.setItem("showModalAfterLogin", "true");
    setPhoneAuthPhase("idle");
    setPhoneOtpInput("");
    setPhoneOtpError(false);
    setResendSeconds(0);
    router.push(await resolvePostLoginHref("other"));
  };

  const onPhoneContinueClick = () => {
    if (!canSubmitPhone) return;
    setPhoneOtpInput("");
    setPhoneOtpError(false);
    setResendSeconds(60);
    setPhoneAuthPhase("otp");
    requestPhoneOtp();
  };

  const onOtpNextClick = () => {
    const otp = phoneOtpInput.replace(/\D/g, "");
    if (otp.length < 6) return;
    if (devPhoneFlow) {
      if (otp !== devPhoneMockExpectedOtp(phoneDigits)) {
        setPhoneOtpError(true);
        toast.error(t("authPhoneDevOtpInvalid"));
        return;
      }
      setPhoneOtpError(false);
      void completeDevPhoneSignIn();
      return;
    }
    toast(t("authPhoneVerifyNotReady"));
  };

  const onResendOtp = () => {
    if (resendSeconds > 0) return;
    setPhoneOtpError(false);
    requestPhoneOtp();
    setResendSeconds(60);
  };

  const onPhoneOtpChange = (digits: string) => {
    setPhoneOtpInput(digits);
    setPhoneOtpError(false);
  };

  const comingSoonProvider = () => {
    toast(t("authFeatureComingSoon"));
  };

  const socialAuthTiles: SocialAuthTileSpec[] = [
    {
      key: "facebook",
      label: t("authSocialFacebook"),
      iconSrc: "/social/login/facebook.svg",
      onClick: handleLoginFacebook,
    },
    {
      key: "google",
      label: onboardingExperiment.google_label || t("authSocialGmail"),
      iconSrc: "/social/login/google.svg",
      onClick: handleLoginGoogle,
    },
    {
      key: "telegram",
      label: onboardingExperiment.telegram_label || t("authSocialTelegram"),
      iconSrc: "/social/login/telegram.svg",
      onClick: loginWithTelegram,
    },
    {
      key: "apple",
      label: t("authSocialApple"),
      iconSrc: "/social/login/apple.svg",
      onClick: comingSoonProvider,
    },
    {
      key: "x",
      label: onboardingExperiment.x_label || t("authSocialX"),
      iconSrc: "/social/login/x.svg",
      onClick: handleLoginX,
    },
    {
      key: "microsoft",
      label: t("authSocialMicrosoft"),
      iconSrc: "/social/login/microsoft.svg",
      onClick: comingSoonProvider,
    },
    {
      key: "wallet",
      label: t("authSocialWallet"),
      iconSrc: "/social/login/wallet-connect.svg",
      onClick: comingSoonProvider,
    },
  ];

  const effectiveSelectCountry =
    selectCountry || listCountries.find((c) => c.code === "TH") || null;

  useLayoutEffect(() => {
    authCountryMenuHeaderRef.current = effectiveSelectCountry;
  }, [effectiveSelectCountry]);

  return (
    <>
      <Dialog
        open={params.get("id") !== null}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        sx={{ " .MuiPaper-root": { borderRadius: "16px" } }}
      >
        <div className="flex w-[400px] max-w-full flex-col gap-5 p-5">
          <div>
            <p className="gc-kicker mb-2">Telegram access</p>
            <p className="text-[24px] font-semibold text-[#103522]">
              {showUpdateEmail
                ? "Verify your email to continue"
                : `Continue with Telegram ${params.get("username") || ""}`}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[#5B6B61]">
              {showUpdateEmail
                ? "We found a Telegram session without a linked email. Add and verify your email so your existing auth flow can complete."
                : "Your Telegram account is ready. Confirm below to finish signing in."}
            </p>
          </div>

          {showUpdateEmail && (
            <>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                />
                <Button
                  onClick={() => {
                    onSendCodeEmail();
                  }}
                >
                  <p className="w-[65px]">Get Code</p>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Verification Code"
                  onChange={(event) => {
                    setVerifyCode(event.target.value);
                  }}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <Button
              fullWidth
              onClick={() => {
                if (showUpdateEmail) {
                  onVerifyCode();
                } else {
                  handleLoginTelegram();
                }
              }}
            >
              {showUpdateEmail ? "Verify & Continue" : "Continue"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/*
        Figma login layout: left visual 588×690; form column lg:h-[690px] to match hero; gap 126px;
        form column widened on lg so 4× social tiles fit in one row inside px-12 (~600px max).
      */}
      <div className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-10 md:px-10 md:pb-24 md:pt-20 lg:px-14 xl:max-2xl:px-20 2xl:px-28">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-[126px]">
          <div className="relative mx-auto aspect-588/690 w-full max-w-[588px] shrink-0 overflow-hidden rounded-[24px] border-2 border-[#e4e4e4] lg:mx-0 lg:aspect-auto lg:h-[690px]">
            <Image
              src="/images/auth-login-hero.png"
              alt={t("authHeroAlt")}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1023px) min(100vw, 588px), 588px"
            />
          </div>

          <div className="flex w-full max-w-[480px] flex-col lg:mx-0 lg:h-[690px] lg:max-w-[600px] lg:shrink-0">
            <div className="flex min-h-0 flex-1 flex-col gap-8 rounded-[24px] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:h-full lg:gap-3 lg:overflow-hidden lg:rounded-none lg:px-10 lg:py-8 lg:shadow-none">
              <div className="flex shrink-0 flex-col items-center text-center">
                <LogoMark className="mb-6 bg-[#fafafa] shadow-[0_4px_24px_rgba(0,0,0,0.06)] lg:mb-2 lg:bg-white lg:shadow-none" />
                <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight text-[#00cc99] lg:text-[1.625rem]">
                  {onboardingExperiment.title ||
                    (pathname === "/login" ? t("authSignInTitle") : t("authSignUpTitle"))}
                </h1>
                <p className="mt-2 text-sm leading-snug text-[#7f7f7f] lg:mt-1 lg:text-[13px]">
                  {onboardingExperiment.description || t("authSubtitle")}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] lg:min-h-0 lg:gap-0 lg:pr-0.5">
                <div className="flex flex-col gap-6 lg:gap-3">
                  {phoneAuthPhase === "idle" ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 gap-y-2 lg:gap-3">
                        <span className="text-base font-medium text-[#3b3b3b] lg:text-sm">
                          {t("authSelectCountry")}
                        </span>
                        <Autocomplete
                          disablePortal
                          disableClearable
                          options={listCountries || []}
                          getOptionLabel={(option) => option.label}
                          isOptionEqualToValue={(a, b) => a.code === b.code}
                          slots={{ paper: AuthCountryMenuPaper }}
                          slotProps={{
                            listbox: {
                              sx: {
                                maxHeight: 208,
                                py: 0.5,
                                px: 0,
                                "& .MuiAutocomplete-option": {
                                  minHeight: 40,
                                },
                              },
                            },
                            popper: {
                              sx: { zIndex: (theme) => theme.zIndex.modal },
                            },
                          }}
                          sx={{
                            width: 208,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "16px",
                              minHeight: 48,
                              "@media (min-width: 1024px)": {
                                minHeight: 44,
                              },
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#00cc99",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#00aa80",
                            },
                          }}
                          value={effectiveSelectCountry ?? undefined}
                          onChange={(_event, newValue) => {
                            setSelectCountry(newValue);
                          }}
                          renderOption={(props, option) => {
                            const { key, ...optionProps } = props;
                            const flag = countryCodeToFlagEmoji(option.code);
                            return (
                              <Box
                                component="li"
                                key={key}
                                {...optionProps}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  px: 2,
                                  py: 1,
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: "#3B3B3B",
                                  "&:hover": { bgcolor: "#f9f9f9" },
                                  '&[aria-selected="true"]': {
                                    bgcolor: "rgba(0, 170, 128, 0.08)",
                                  },
                                }}
                              >
                                {flag ? (
                                  <Box
                                    component="span"
                                    aria-hidden
                                    sx={{
                                      fontSize: 18,
                                      lineHeight: 1,
                                      flexShrink: 0,
                                      width: 24,
                                      textAlign: "center",
                                    }}
                                  >
                                    {flag}
                                  </Box>
                                ) : null}
                                <span>{option.label}</span>
                              </Box>
                            );
                          }}
                          renderInput={(params) => {
                            const inputFlag = effectiveSelectCountry
                              ? countryCodeToFlagEmoji(effectiveSelectCountry.code)
                              : "";
                            return (
                              <TextField
                                {...params}
                                placeholder={t("preferencesCountryPlaceholder")}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      {inputFlag ? (
                                        <Box
                                          component="span"
                                          aria-hidden
                                          sx={{
                                            fontSize: 20,
                                            lineHeight: 1,
                                            flexShrink: 0,
                                            ml: 0.25,
                                            mr: 0.5,
                                          }}
                                        >
                                          {inputFlag}
                                        </Box>
                                      ) : null}
                                      {params.InputProps.startAdornment}
                                    </>
                                  ),
                                }}
                              />
                            );
                          }}
                        />
                      </div>

                      <div className="flex flex-col gap-2 lg:gap-1.5">
                        <p className="text-base font-medium text-[#3b3b3b] lg:text-sm">
                          {pathname === "/login"
                            ? t("authPhoneLabelSignIn")
                            : t("authPhoneLabelSignUp")}
                        </p>
                        <div className="flex gap-2">
                          <TextField
                            value={dialCode}
                            disabled
                            size="small"
                            sx={{
                              width: 100,
                              "& .MuiInputBase-root": {
                                borderRadius: "16px",
                                height: 56,
                                backgroundColor: "#fafafa",
                                "@media (min-width: 1024px)": {
                                  height: 48,
                                },
                              },
                            }}
                          />
                          <TextField
                            placeholder={t("authPhonePlaceholder")}
                            value={phoneLocal}
                            onChange={(e) => {
                              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setPhoneLocal(digitsOnly);
                            }}
                            inputMode="numeric"
                            autoComplete="tel-national"
                            inputProps={{ maxLength: 10 }}
                            sx={{
                              flex: 1,
                              "& .MuiInputBase-root": {
                                borderRadius: "16px",
                                height: 56,
                                "@media (min-width: 1024px)": {
                                  height: 48,
                                },
                              },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(152,152,152,0.4)",
                              },
                            }}
                          />
                        </div>
                      </div>

                      <AuthPrivacyConsentField
                        id="auth-privacy-checkbox"
                        checked={privacyAccepted}
                        onCheckedChange={setPrivacyAccepted}
                        leadText={t("authPrivacyLead")}
                        policyLabel={t("Privacy Policy")}
                      />

                      <div className="flex justify-center pt-1 lg:pt-0">
                        <button
                          type="button"
                          disabled={!canSubmitPhone}
                          onClick={onPhoneContinueClick}
                          className={`h-12 min-w-[240px] rounded-full px-6 text-base font-medium transition lg:h-10 lg:min-w-[220px] lg:text-sm ${
                            canSubmitPhone
                              ? "bg-[#00cc99] text-white hover:opacity-95"
                              : "cursor-not-allowed bg-[#f6f6f6] text-[#989898]"
                          }`}
                        >
                          {pathname === "/login" ? t("authSignInTitle") : t("authSignUpTitle")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-6 lg:gap-6">
                      <div className="flex flex-col gap-1 text-left">
                        <p className="text-base font-medium leading-normal text-[#3b3b3b] lg:text-base">
                          {pathname === "/login"
                            ? t("authPhoneLabelSignIn")
                            : t("authPhoneLabelSignUp")}
                        </p>
                        <p className="text-sm leading-snug text-[#7f7f7f] lg:text-sm">
                          {t("authPhoneOtpScreenIntro")}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#7f7f7f]">
                          <span>{t("authPhoneOtpSentToLabel")}</span>
                          <span className="whitespace-nowrap tabular-nums">{phoneMaskedTail}</span>
                        </div>
                        <button
                          type="button"
                          className="mt-2 w-fit text-left text-xs font-medium text-[#0064d6] underline decoration-solid underline-offset-2"
                          onClick={() => {
                            setPhoneAuthPhase("idle");
                            setPhoneOtpInput("");
                            setPhoneOtpError(false);
                            setResendSeconds(0);
                          }}
                        >
                          {t("authPhoneChangeNumber")}
                        </button>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <PhoneOtpSixBoxes
                          value={phoneOtpInput}
                          onChange={onPhoneOtpChange}
                          hasError={phoneOtpError}
                          errorDescriptionId={
                            phoneOtpError ? "auth-phone-otp-error-desc" : undefined
                          }
                          ariaLabel={t("authPhoneOtpLabel")}
                        />
                        {phoneOtpError ? (
                          <p id="auth-phone-otp-error-desc" className="sr-only" role="alert">
                            {t("authPhoneOtpErrorAria")}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center justify-center gap-1 py-px text-xs leading-normal">
                          <button
                            type="button"
                            disabled={resendSeconds > 0}
                            onClick={onResendOtp}
                            className="text-[#7f7f7f] underline decoration-solid underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                          >
                            {t("authPhoneResend")}
                          </button>
                          <span className="text-[#0064d6]" aria-live="polite">
                            {formatOtpCountdown(resendSeconds)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-center pt-1 lg:pt-0">
                        <button
                          type="button"
                          disabled={phoneOtpInput.replace(/\D/g, "").length < 6 || phoneOtpError}
                          onClick={onOtpNextClick}
                          className={`h-12 min-w-[240px] rounded-full px-6 text-base font-medium transition lg:h-10 lg:min-w-[220px] lg:text-sm ${
                            phoneOtpInput.replace(/\D/g, "").length >= 6 && !phoneOtpError
                              ? "bg-[#00cc99] text-white hover:opacity-95"
                              : "cursor-not-allowed bg-[#f6f6f6] text-[#989898]"
                          }`}
                        >
                          {t("authPhoneNext")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-5 lg:mt-4 lg:gap-3">
                  <div className="flex items-center gap-3 lg:gap-2">
                    <div className="h-px flex-1 bg-[#e4e4e4]" />
                    <span className="shrink-0 text-sm text-[#989898] lg:text-xs">
                      {pathname === "/login" ? t("authOrSocialSignIn") : t("authOrSocial")}
                    </span>
                    <div className="h-px flex-1 bg-[#e4e4e4]" />
                  </div>
                  <div
                    className="mx-auto flex w-full max-w-126 flex-col items-center gap-2 lg:gap-2"
                    role="group"
                    aria-label={pathname === "/login" ? t("authOrSocialSignIn") : t("authOrSocial")}
                  >
                    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-2">
                      {socialAuthTiles.slice(0, 4).map((tile) => (
                        <div key={tile.key} className="flex justify-center">
                          <SocialAuthTile
                            label={tile.label}
                            iconSrc={tile.iconSrc}
                            onClick={tile.onClick}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid w-full max-w-90 grid-cols-3 gap-2 lg:gap-2">
                      {socialAuthTiles.slice(4).map((tile) => (
                        <div key={tile.key} className="flex justify-center">
                          <SocialAuthTile
                            label={tile.label}
                            iconSrc={tile.iconSrc}
                            onClick={tile.onClick}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden">
                <TelegramLogin />
              </div>
              <div className="hidden">
                <ButtonLogin
                  handleLogin={handleLoginFacebook}
                  icon="/social/login/facebook.svg"
                  text="Facebook"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default LoginComponent;
