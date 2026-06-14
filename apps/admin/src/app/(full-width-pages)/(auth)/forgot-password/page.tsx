import { Suspense } from "react";
import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Forgot Password | GoGoCash Admin",
  description: "Request a password reset link for the GoGoCash admin dashboard.",
};

function Fallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
    </div>
  );
}

export default async function ForgotPasswordPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <Suspense fallback={<Fallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
