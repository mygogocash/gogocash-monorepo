import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Next.js Basic Table | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Basic Table  page for TailAdmin  Tailwind CSS Admin Dashboard Template",
  // other metadata
};

export default async function UsersAdmin(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Users Admin" />
      <div className="space-y-6">
        <ComponentCard title="Users Admin Table" />
      </div>
    </div>
  );
}
