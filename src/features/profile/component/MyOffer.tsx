"use client";

import { IResponseMyOffer } from "@/interfaces/offer";
import { fetcherPost } from "@/lib/axios/client";
import CopyAll from "@mui/icons-material/CopyAll";
import { IconButton } from "@mui/material";
import { LazyDataGrid, type GridColDef } from "@/components/perf/LazyMuiDataGrid";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import SubPage from "../layout/SubPage";
const paginationModel = { page: 0, pageSize: 5 };

const MyOffer = () => {
  const [offerSearch] = useState({
    category: "",
    page: 1,
    limit: 18,
    search: "",
  });
  const t = useTranslations();

  const {
    data: offers,
    // error,
    // isLoading,
    // isError,
  } = useQuery<IResponseMyOffer[]>({
    queryKey: ["getMyOffer", offerSearch],
    queryFn: () =>
      fetcherPost(`/offer/my-offers?limit=${offerSearch.limit}&page=${offerSearch.page}`),
    staleTime: Infinity,
    enabled: offerSearch.page > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const columns: GridColDef[] = [
    { field: "offer_id", headerName: t("offer id"), width: 70 },
    {
      field: "deeplink",
      headerName: t("deeplink"),
      width: 200,
      renderCell: (params) => (
        <div>
          {params.value}{" "}
          <IconButton
            type="button"
            aria-label={t("Copy Link")}
            onClick={() => void navigator.clipboard.writeText(String(params.value))}
          >
            <CopyAll fontSize="small" />
          </IconButton>
        </div>
      ),
    },
    { field: "createdAt", headerName: t("Created At"), width: 130 },
    { field: "offer_name", headerName: t("offer_name"), width: 200 },
  ];

  const dataRow = useMemo(() => {
    return offers?.map((offer) => ({
      id: offer._id,
      offer_id: offer.offer_id,
      deeplink: offer.deeplink,
      createdAt: new Date(offer.createdAt).toLocaleDateString(),
      offer_name: offer.offer_name,
    }));
  }, [offers]);
  return (
    <SubPage title="My Offer" showSubMenu>
      <LazyDataGrid
        rows={dataRow || []}
        columns={columns}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10]}
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
    </SubPage>
  );
};
export default MyOffer;
