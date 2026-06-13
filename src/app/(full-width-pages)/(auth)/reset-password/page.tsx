import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Reset Password | GoGoCash Admin",
  description: "Set a new password for your GoGoCash admin account.",
};

function Fallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
    </div>
  );
}

export default async function ResetPasswordPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <Suspense fallback={<Fallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
