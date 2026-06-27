"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FormOffer from "@/components/offer/FormOffer";
import { fetcher } from "@/lib/axios/client";
import {
  emptyOfferRequestForm,
  offerToEditForm,
} from "@/lib/offerEditForm";
import type { Offer } from "@/types/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type BrandDetailRouteClientProps = {
  offerId: string;
};

export default function BrandDetailRouteClient({
  offerId,
}: BrandDetailRouteClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyOfferRequestForm);
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: offer,
    isPending,
    isError,
  } = useQuery<Offer>({
    queryKey: ["getOffersDetailData", offerId],
    queryFn: () => fetcher(`/offer/${offerId}`),
    enabled: Boolean(offerId),
  });

  useEffect(() => {
    if (offer) {
      setForm(offerToEditForm(offer));
    }
  }, [offer]);

  const invalidateOffer = () => {
    void queryClient.invalidateQueries({ queryKey: ["getOffersDetailData", offerId] });
    void queryClient.invalidateQueries({ queryKey: ["offers", "list"] });
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (isError || !offer) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb
          pageTitle="Brand not found"
          items={[
            { label: "Home", href: "/" },
            { label: "Brands Management", href: "/brands" },
            { label: "Not found" },
          ]}
        />
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This brand could not be loaded. The link may be invalid or the offer
            was removed.
          </p>
          <button
            type="button"
            onClick={() => router.push("/brands")}
            className="bg-brand-500 hover:bg-brand-600 mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            Back to Brands
          </button>
        </div>
      </div>
    );
  }

  const title =
    offer.offer_name_display?.trim() || offer.offer_name || offer._id;

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        pageTitle={title}
        items={[
          { label: "Home", href: "/" },
          { label: "Brands Management", href: "/brands" },
          { label: title },
        ]}
      />
      <FormOffer
        fetchOffers={invalidateOffer}
        openModal={offer}
        setOpenModal={(next) => {
          if (next === false) {
            router.push("/brands");
          }
        }}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </div>
  );
}
