"use client";
import { ResponseWithdrawCheck } from "@/interfaces/withdraw";
import { fetcherPost } from "@/lib/axios/client";
import { useSafeAuth, useSafeWallet } from "./useSafeCrossmint";
import { useQuery } from "@tanstack/react-query";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";

interface LoginState {
  isLoggingIn: boolean;
  hasAttemptedLogin: boolean;
  error: string | null;
  retryCount: number;
}

const useCrossmintLogin = () => {
  const crossmintAuth = useSafeAuth();
  const { user, jwt, status: statusAuth } = crossmintAuth;
  const crossmintWallet = useSafeWallet();
  const { wallet, status } = crossmintWallet;
  const [isMounted, setIsMounted] = useState<boolean>();
  const loginAttemptRef = useRef(false);
  const { data: session } = useSession();

  // Get referral_id safely without useSearchParams to avoid Suspense issues
  const [referral_id, setReferralId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Access search params on client side only, after mount
    if (typeof window !== "undefined") {
      setIsMounted(true);
      const params = new URLSearchParams(window.location.search);
      const id = params.get("referral_id");
      if (id) {
        setReferralId(id);
      }
    }
  }, []);

  const maxRetries = 3;

  const [loginState, setLoginState] = useState<LoginState>({
    isLoggingIn: false,
    hasAttemptedLogin: false,
    error: null,
    retryCount: 0,
  });

  // Reset login state when user logs out
  useEffect(() => {
    if (statusAuth === "logged-out") {
      setLoginState({
        isLoggingIn: false,
        hasAttemptedLogin: false,
        error: null,
        retryCount: 0,
      });
      loginAttemptRef.current = false;
    }
  }, [statusAuth]);

  const signInCrossmintToBackend = useCallback(async () => {
    // Prevent multiple simultaneous attempts
    if (loginAttemptRef.current) {
      return;
    }

    if (!jwt) {
      const error = "Authentication token not available";
      setLoginState((prev) => ({ ...prev, error }));
      toast.error(error);
      return;
    }

    if (loginState.hasAttemptedLogin || loginState.retryCount >= maxRetries) {
      return;
    }

    loginAttemptRef.current = true;
    setLoginState((prev) => ({
      ...prev,
      isLoggingIn: true,
      error: null,
    }));

    try {
      // Sign in to NextAuth with proper error handling
      const result = await signIn("crossmint", {
        jwt: jwt,
        userId: user?.id,
        email: user?.email,
        address: wallet?.address,
        // username: userData?.username,
        id_twitter: user?.twitter?.id,
        referral_id: referral_id,
        // _id: userData?._id,
        // userId: userData.id_crossmint,
        // email: userData.email,
        // address: userData.address,
        // username: userData?.username,
        // id_twitter: userData?.id_twitter,
        // _id: userData?._id,
        redirect: false, // Handle redirect manually
      }).catch(() => undefined);
      // console.log("signIn result", result);

      if (result?.ok) {
        setLoginState((prev) => ({
          ...prev,
          isLoggingIn: false,
          error: null,
        }));
        window.sessionStorage.setItem("isAfterLogin", "false");
      }
      if (result?.error) {
        throw new Error(`NextAuth error: ${result.error}`);
      }
      // }
      // else {
      //   throw new Error(response?.message || 'Backend authentication failed');
      // }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Login error occurred";

      setLoginState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoggingIn: false,
        retryCount: prev.retryCount + 1,
        hasAttemptedLogin: prev.retryCount + 1 >= maxRetries,
      }));

      // Only show toast for first few errors to avoid spam
      if (loginState.retryCount < 2) {
        toast.error(errorMessage);
      }
      crossmintAuth.logout();
    } finally {
      loginAttemptRef.current = false;
    }
    /* Deps intentionally exclude full `loginState` and `referral_id`: merging them causes this callback
     * identity to churn every render and can duplicate `signIn` calls. Retry + attempt flags are listed
     * explicitly; `signIn` uses functional updates where needed. */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [jwt, loginState.hasAttemptedLogin, loginState.retryCount, wallet?.address, user]);

  // Auto-login when Crossmint authentication is successful
  useEffect(() => {
    if (
      statusAuth === "logged-in" &&
      user &&
      jwt &&
      !loginState.hasAttemptedLogin &&
      !loginState.isLoggingIn &&
      !loginAttemptRef.current &&
      loginState.retryCount < maxRetries
    ) {
      // console.log('✅ Crossmint user authenticated, starting backend login:', {
      //   user: { id: user.id, email: user.email },
      //   wallet: { address: wallet?.address, status },
      // });

      // Add a small delay to prevent rapid fire requests
      const timeoutId = setTimeout(() => {
        if (window.sessionStorage.getItem("isAfterLogin") === "true") {
          signInCrossmintToBackend();
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [
    statusAuth,
    user,
    jwt,
    wallet?.address,
    signInCrossmintToBackend,
    loginState.hasAttemptedLogin,
    loginState.isLoggingIn,
    loginState.retryCount,
    status,
  ]);

  const signOutAuth = useCallback(async () => {
    await Promise.all([crossmintAuth.logout(), signOut({ redirect: true, callbackUrl: "/" })]);
    setLoginState({
      isLoggingIn: false,
      hasAttemptedLogin: false,
      error: null,
      retryCount: 0,
    });
    loginAttemptRef.current = false;
  }, [crossmintAuth]);

  // Debug what we're returning
  // console.log('🔍 useCrossmintLogin returning:', {
  //   hasLogin: !!crossmintAuth.login,
  //   loginType: typeof crossmintAuth.login,
  //   statusAuth: crossmintAuth.status,
  //   hasUser: !!crossmintAuth.user,
  //   hasJwt: !!crossmintAuth.jwt,
  // });

  const getCheckQuery = useQuery<ResponseWithdrawCheck>({
    queryKey: ["getCheck"],
    queryFn: () => fetcherPost("/withdraw/check"),
    staleTime: Infinity,
    enabled: Boolean(session?.user) && isMounted === true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    ...crossmintAuth,
    ...crossmintWallet,
    signOutAuth,
    loginState,
    /** Wallet check payload when the query has succeeded; `undefined` while pending or if disabled. */
    getCheck: getCheckQuery.data,
    isGetCheckPending: getCheckQuery.isPending,
    isGetCheckError: getCheckQuery.isError,
    getCheckError: getCheckQuery.error,
    session,
  };
};

export default useCrossmintLogin;
