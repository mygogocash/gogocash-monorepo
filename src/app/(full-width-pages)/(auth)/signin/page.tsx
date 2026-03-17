import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign In | GoGoCash Admin",
  description: "Sign in is currently disabled.",
};

/** Sign-in page disabled: redirect to dashboard. */
export default function SignIn() {
  redirect("/dashboard");
}
