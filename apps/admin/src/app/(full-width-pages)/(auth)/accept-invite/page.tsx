import { Suspense } from "react";
import type { Metadata } from "next";
import AcceptInviteForm from "@/components/auth/AcceptInviteForm";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Accept Invitation | GoGoCash Admin",
  description: "Set up your GoGoCash admin account.",
};

function Fallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
    </div>
  );
}

export default async function AcceptInvitePage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <Suspense fallback={<Fallback />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
