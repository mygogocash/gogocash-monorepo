"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Offer } from "@/types/api";
import { fetcher } from "@/lib/axios/client";
import Card from "../common/Card";
import { CouponData, CouponRequestForm } from "@/types/coupon";
import FormCoupon from "../coupon/FormCoupon";
import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { OfferCouponGridRow } from "./OfferCouponDataGrid";

const OfferCouponDataGrid = dynamic(() => import("./OfferCouponDataGrid"), {
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
  ),
});

/** @deprecated Import from `@/components/offer/muiGridShared` instead. */
export { paginationModel } from "./muiGridShared";

const Detail = () => {
  const [openModal, setOpenModal] = useState<boolean | CouponRequestForm>(false);
  const [isLoading, setIsLoading] = useState(false);
  const defaultValue = {
    name: "",
    description: "",
    code: "",
    offer_id: "",
    start_date: "",
    end_date: "",
    eligibility: "",
    min_spend: "",
    discount: 0,
  };
  const [form, setForm] = useState<CouponRequestForm>(defaultValue);

  const { id } = useParams();
  const { data: offerDetail } = useQuery<Offer>({
    queryKey: ["getOffersDetailData", id],
    queryFn: () => fetcher(`/offer/${id}`),
    enabled: !!id,
  });

  const { data: couponDetail, refetch } = useQuery<CouponData[]>({
    queryKey: ["getOffersCouponData", id],
    queryFn: () => fetcher(`/offer/get-coupon-id/${id}`),
    enabled: !!id,
  });

  const handleEditCouponRow = useCallback((list: OfferCouponGridRow) => {
    const dt: CouponRequestForm = {
      name: list.name,
      description: list.description,
      code: list.code,
      offer_id: list.offer_id._id,
      start_date: list.start_date,
      end_date: list.end_date,
      eligibility: list.eligibility,
      min_spend: list.min_spend,
      discount: list.discount,
      id: list._id,
      link: list.link || "",
    };
    setOpenModal(dt);
    setForm(dt);
  }, []);

  return (
    <Card title={`${offerDetail?.offer_name || ""}`}>
      <div className="my-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            setOpenModal(true);
            setForm({ ...defaultValue, offer_id: id as string });
          }}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          Create
        </button>
      </div>
      <FormCoupon
        showOfferField={false}
        fetchData={function (): void {
          refetch();
        }}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
      <OfferCouponDataGrid couponDetail={couponDetail} onEditRow={handleEditCouponRow} />
    </Card>
  );
};
export default Detail;
