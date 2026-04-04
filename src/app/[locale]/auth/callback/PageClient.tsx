"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

export default function PageClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const updateProfile = async () => {
    if (!token) return;
    try {
      await signIn("firebase", {
        jwt: token,
        email: "",
        referral_id: undefined,
        type: "telegram",
        country: "Thailand",
        callbackUrl: "/",
        redirect: true,
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Sign-in failed. Please try again.");
    }
  };
  useEffect(() => {
    if (token) {
      updateProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return <div></div>;
}
