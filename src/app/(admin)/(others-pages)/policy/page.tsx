import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Policy Management | GoGoCash Admin",
  description: "Manage terms and conditions per category",
};

export default function PolicyPage() {
  redirect("/offers?tab=policy");
}
