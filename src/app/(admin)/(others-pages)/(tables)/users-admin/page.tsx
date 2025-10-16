import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Basic Table | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Basic Table  page for TailAdmin  Tailwind CSS Admin Dashboard Template",
  // other metadata
};

const UsersAdmin = () => {
  return (
    <div>
      <PageBreadcrumb pageTitle="Users Admin" />
      <div className="space-y-6">
        <ComponentCard title="Users Admin Table" />
      </div>
    </div>
  );
};

export default UsersAdmin;
