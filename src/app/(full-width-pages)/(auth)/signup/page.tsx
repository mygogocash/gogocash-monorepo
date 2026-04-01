import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Next.js SignUp Page | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js SignUp Page TailAdmin Dashboard Template",
  // other metadata
};

export default async function SignUp(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return <SignUpForm />;
}
