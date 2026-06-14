import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Executive dashboard | GoGoCash Admin",
  description:
    "Leadership view of growth, revenue, engagement, partners, operations, and roadmap execution.",
};

export default function ExecutiveLayout({ children }: { children: ReactNode }) {
  return children;
}
