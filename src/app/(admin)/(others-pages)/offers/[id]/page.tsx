import { Metadata } from "next";
import Detail from "@/components/offer/Detail";

export const metadata: Metadata = {
  title: "Offers | TailAdmin - Next.js Dashboard Template",
};

export default function OffersDetailPage() {
  return (
    <div className="space-y-6">
      <Detail />
    </div>
  );
}
