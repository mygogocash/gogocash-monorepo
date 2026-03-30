import SignInForm from "@/components/auth/SignInForm";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | GoGoCash Admin",
  description: "Sign in to the GoGoCash admin dashboard.",
};

function SignInFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  );
}
