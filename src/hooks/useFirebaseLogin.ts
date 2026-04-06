"use client";
import { usePathname, useRouter } from "@/i18n/navigation";
import { OptionsCountries } from "@/interfaces/country";
import { getClientAuth, googleProvider } from "@/lib/firebaseClient";
import { getPostHogDistinctId, getPostHogAnonymousId, getAppLocale } from "@/lib/posthog";
import { signInWithPopup, FacebookAuthProvider, TwitterAuthProvider } from "firebase/auth";
import { signIn } from "next-auth/react";
import React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { trackMetaCompleteRegistration } from "@/lib/metaPixel";
import { resolvePostLoginHref } from "@/lib/auth/postLoginRedirect";

const useFirebaseLogin = () => {
  // Get referral_id safely without useSearchParams to avoid Suspense issues
  const [referral_id, setReferralId] = useState<string | undefined>(undefined);

  const router = useRouter();
  const pathname = usePathname();
  const [selectCountry, setSelectCountry] = React.useState<OptionsCountries | null>({
    label: "Thailand",
    code: "TH",
    value: "Thailand",
  });
  useEffect(() => {
    // Access search params on client side only, after mount
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("referral_id");
      if (id) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReferralId(id);
      }
    }
  }, []);

  const handleModalAfterLogin = () => {
    // `ModalAfterLogin` reads this flag on the home route after social sign-in.
    window.sessionStorage.setItem("showModalAfterLogin", "true");
  };
  const handleLoginGoogle = async () => {
    try {
      const result = await signInWithPopup(getClientAuth(), googleProvider);
      if (result.user) {
        const token = await result.user.getIdToken();
        try {
          const response = await signIn("firebase", {
            jwt: token,
            email: result.user.email,
            referral_id,
            country: selectCountry?.label || "Thailand",
            pathname,
            posthog_distinct_id: getPostHogDistinctId() || "",
            posthog_anonymous_id: getPostHogAnonymousId() || "",
            locale: getAppLocale(),
            auth_flow: pathname?.includes("/register") ? "register" : "login",
            callbackUrl: "/",
            redirect: false,
          });
          if (!response?.ok) {
            if (response?.status === 401) {
              router.push("/register");
            }
            toast.error("Login failed. Please register.");
          } else {
            if (pathname?.includes("/register")) {
              trackMetaCompleteRegistration({ status: true });
            }
            handleModalAfterLogin();
            router.push(await resolvePostLoginHref("social"));
          }
        } catch {
          toast.error("Login failed. Please try again.");
        }
      }
    } catch {
      toast.error("Login failed. Please register.");
    }
  };

  const handleLoginX = async () => {
    try {
      const provider = new TwitterAuthProvider();
      const result = await signInWithPopup(getClientAuth(), provider);
      if (result.user) {
        const token = await result.user.getIdToken();
        try {
          const response = await signIn("firebase", {
            jwt: token,
            email: result.user.email,
            referral_id,
            pathname,
            country: selectCountry?.label || "Thailand",
            posthog_distinct_id: getPostHogDistinctId() || "",
            posthog_anonymous_id: getPostHogAnonymousId() || "",
            locale: getAppLocale(),
            auth_flow: pathname?.includes("/register") ? "register" : "login",
            callbackUrl: "/",
            redirect: false,
          });
          if (!response?.ok) {
            if (response?.status === 401) {
              toast.error(`Login failed. Please register.`);
              router.push("/register");
            } else {
              toast.error(
                `${
                  pathname?.includes("register") ? "Registration" : "Login"
                } failed. Please try again.`
              );
            }
          } else {
            if (pathname?.includes("/register")) {
              trackMetaCompleteRegistration({ status: true });
            }
            handleModalAfterLogin();
            router.push(await resolvePostLoginHref("social"));
          }
        } catch {
          toast.error(
            `${pathname?.includes("register") ? "Registration" : "Login"} failed. Please try again.`
          );
        }
      }
    } catch {
      toast.error("Login failed. Please register.");
    }
  };

  const handleLoginFacebook = async () => {
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope("email");
      const result = await signInWithPopup(getClientAuth(), provider);

      if (result.user) {
        const token = await result.user.getIdToken();
        try {
          const response = await signIn("firebase", {
            jwt: token,
            email: result.user.email,
            referral_id,
            pathname,
            country: selectCountry?.label || "Thailand",
            posthog_distinct_id: getPostHogDistinctId() || "",
            posthog_anonymous_id: getPostHogAnonymousId() || "",
            locale: getAppLocale(),
            auth_flow: pathname?.includes("/register") ? "register" : "login",
            callbackUrl: "/",
            redirect: false,
          });
          if (!response?.ok) {
            if (response?.status === 401) {
              toast.error(`Login failed. Please register.`);
              router.push("/register");
            } else {
              toast.error(
                `${
                  pathname?.includes("register") ? "Registration" : "Login"
                } failed. Please try again.`
              );
            }
          } else {
            if (pathname?.includes("/register")) {
              trackMetaCompleteRegistration({ status: true });
            }
            handleModalAfterLogin();
            router.push(await resolvePostLoginHref("social"));
          }
        } catch {
          toast.error(
            `${pathname?.includes("register") ? "Registration" : "Login"} failed. Please try again.`
          );
        }
      }
    } catch {
      toast.error("Login failed. Please register.");
    }
  };
  return {
    handleLoginGoogle,
    selectCountry,
    setSelectCountry,
    handleLoginX,
    handleLoginFacebook,
  };
};

export default useFirebaseLogin;
