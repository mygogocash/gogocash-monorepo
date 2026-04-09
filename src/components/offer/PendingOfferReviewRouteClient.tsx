"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  getMockPendingOffers,
  persistMockPendingOffers,
  type PendingOfferRow,
} from "@/data/mockPendingOffers";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PendingOfferReviewPage } from "./PendingOfferReviewContent";

export default function PendingOfferReviewRouteClient({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<PendingOfferRow | null | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => {
      setOffer(getMockPendingOffers().find((o) => o._id === offerId) ?? null);
    });
  }, [offerId]);

  const removeAndPersist = useCallback((id: string) => {
    const next = getMockPendingOffers().filter((o) => o._id !== id);
    persistMockPendingOffers(next);
  }, []);

  const handleApprove = useCallback(
    (o: PendingOfferRow) => {
      removeAndPersist(o._id);
      toast.success(`Approved “${o.offer_name_display || o.offer_name}”.`);
      router.push("/offers");
    },
    [removeAndPersist, router],
  );

  const handleReject = useCallback(
    (o: PendingOfferRow) => {
      if (
        !confirm(
          `Reject “${o.offer_name_display || o.offer_name}”? This cannot be undone in the mock UI.`,
        )
      ) {
        return;
      }
      removeAndPersist(o._id);
      toast(`Rejected “${o.offer_name_display || o.offer_name}”.`, { icon: "⛔" });
      router.push("/offers");
    },
    [removeAndPersist, router],
  );

  const handleClose = useCallback(() => {
    router.push("/offers");
  }, [router]);

  if (offer === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb
          pageTitle="Review pending offer"
          items={[
            { label: "Home", href: "/" },
            { label: "Offers Management", href: "/offers" },
            { label: "Offers", href: "/offers" },
            { label: "Not found" },
          ]}
        />
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This pending submission is no longer in the queue, or the link is invalid.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Back to Offers
          </button>
        </div>
      </div>
    );
  }

  const title = offer.offer_name_display?.trim() || offer.offer_name;

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        pageTitle={title}
        items={[
          { label: "Home", href: "/" },
          { label: "Offers Management", href: "/offers" },
          { label: "Offers", href: "/offers" },
          { label: "Review" },
        ]}
      />
      <PendingOfferReviewPage
        offer={offer}
        onClose={handleClose}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
