"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Offer } from "@/types/api";
import { fetcher } from "@/lib/axios/client";
import Card from "../common/Card";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { CouponData, CouponRequestForm } from "@/types/coupon";
import FormCoupon from "../coupon/FormCoupon";
import { useState } from "react";
export const paginationModel = { page: 0, pageSize: 5 };

const Detail = () => {
  const [openModal, setOpenModal] = useState<boolean | CouponRequestForm>(
    false,
  );
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
    staleTime: 0,
    enabled: !!id,
  });

  const { data: couponDetail, refetch } = useQuery<CouponData[]>({
    queryKey: ["getOffersCouponData", id],
    queryFn: () => fetcher(`/offer/get-coupon-id/${id}`),
    staleTime: 0,
    enabled: !!id,
  });

  const column2: GridColDef[] = [
    { field: "id", headerName: "ID", width: 200 },
    // { field: "withdraw_id", headerName: "Withdraw ID", width: 130 },
    {
      field: "name",
      headerName: "Name",
      width: 100,
    },
    {
      field: "code",
      headerName: "Code",
      width: 100,
    },
    {
      field: "link",
      headerName: "Link",
      width: 100,
    },
    {
      field: "description",
      headerName: "Description",
      width: 100,
    },
    {
      field: "start_date",
      headerName: "Start Date",
      width: 100,
    },
    {
      field: "end_date",
      headerName: "End Date",
      width: 100,
    },

    {
      field: "min_spend",
      headerName: "Min Spend",
      width: 100,
    },
    {
      field: "eligibility",
      headerName: "Eligibility",
      width: 100,
    },
    {
      field: "discount",
      headerName: "Discount",
      width: 100,
    },
    {
      field: "action",
      headerName: "Action",
      width: 100,
      renderCell: (params) => (
        <button
          onClick={() => {
            const list = params.row;
            const dt = {
              name: list.name,
              description: list.description,
              code: list.code,
              offer_id: list.offer_id._id,
              start_date: list.start_date,
              end_date: list.end_date,
              eligibility: list.eligibility,
              min_spend: list.min_spend,
              discount: list.discount,
              id: list.id,
              link: list.link || "",
            };
            setOpenModal(dt);
            setForm(dt);
          }}
          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
        >
          Edit
        </button>
      ),
    },
  ];
  return (
    <Card title={`${offerDetail?.offer_name || ""}`}>
      <div className="my-2 flex items-center justify-end">
        <button
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
          //   throw new Error("Function not implemented.");
        }}
        openModal={openModal}
        setOpenModal={function (
          value: React.SetStateAction<boolean | CouponRequestForm>,
        ): void {
          setOpenModal(value);
        }}
        form={form}
        setForm={function (
          value: React.SetStateAction<CouponRequestForm>,
        ): void {
          setForm(value);
        }}
        isLoading={isLoading}
        setIsLoading={function (value: React.SetStateAction<boolean>): void {
          setIsLoading(value);
        }}
      />
      <DataGrid
        rows={
          couponDetail?.map((coupon) => ({
            id: coupon._id,
            name: coupon.name,
            description: coupon.description,
            start_date: coupon.start_date,
            end_date: coupon.end_date,
            code: coupon.code,
            offer_id: coupon.offer_id,
            eligibility: coupon.eligibility,
            min_spend: coupon.min_spend,
            discount: coupon.discount,
            disabled: coupon.disabled,
            link: coupon.link,
          })) || []
        }
        columns={column2}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10]}
        // checkboxSelection
        sx={{
          border: 0,
          "& .MuiSvgIcon-root": { fill: "#00B14F" },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: "#F6F6F6",
          },
          "& .MuiDataGrid-filler": {
            backgroundColor: "#F6F6F6 !important",
          },
        }}
      />
    </Card>
  );
};
export default Detail;
