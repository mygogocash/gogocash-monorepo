/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import {
  DataWithdrawsList,
  ResponseWithdraws,
  WithdrawQuery,
} from "@/types/api";
import { useSession } from "next-auth/react";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Select from "../form/Select";
import client, { fetcherPost } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { ConversionInWithdraw } from "@/types/withdraw";
import toast from "react-hot-toast";
interface WithdrawRequestForm {
  file: File | null;
  id: string;
  status: string;
}
export default function WithdrawTable() {
  const { data } = useSession();
  const session = data as { accessToken?: string };
  const { loading, error, getWithdraws, deleteOffer, clearError } = useApi();
  const [openModal, setOpenModal] = useState<DataWithdrawsList | boolean>(
    false,
  );
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<WithdrawRequestForm>({
    file: null,
    id: "",
    status: "",
  });
  const [lists, setLists] = useState<ResponseWithdraws>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [query, setQuery] = useState<WithdrawQuery>({
    search: "",
    limit: 10,
    page: 1,
  });

  const { data: getDetailConversionWithdraw } = useQuery<
    ConversionInWithdraw[]
  >({
    queryKey: ["getDetailConversionWithdraw", openModal],
    queryFn: () =>
      fetcherPost([
        `/admin/getConversionInWithdraw`,
        { data: (openModal as DataWithdrawsList).conversion_id as number[] },
      ]),
  });

  // Fetch offers
  const fetchOffers = async (newQuery?: WithdrawQuery) => {
    try {
      const queryToUse = newQuery || query;
      const response = await getWithdraws(
        queryToUse,
        session?.accessToken || "",
      );
      setLists(response);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });
    } catch (err) {
      console.error("Failed to fetch offers:", err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOffers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search
  const handleSearch = (searchValue: string) => {
    const newQuery = { ...query, search: searchValue, page: 1 };
    setQuery(newQuery);
    fetchOffers(newQuery);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newQuery = { ...query, page: newPage };
    setQuery(newQuery);
    fetchOffers(newQuery);
  };

  // Handle offer deletion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      await deleteOffer(offerId);
      fetchOffers(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete offer:", err);
    }
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format price
  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(price);
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  const handleSave = () => {
    const formData = new FormData();
    formData.append("id", form.id);
    formData.append("status", form.status);
    if (form.file) {
      formData.append("file", form.file);
    }
    setIsLoading(true);
    client
      .patch(`/admin/update-request-withdraw`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        setOpenModal(false);
        fetchOffers();
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        console.error("Failed to update withdraw request:", err);
      });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Lists
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {pagination.total}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search offers..."
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden xl:w-[300px] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
            <button
              onClick={clearError}
              className="ml-2 text-red-800 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading offers...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Offers Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {lists?.data?.map((list, index) => (
                    <tr
                      key={list._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          Method: {list.method || "N/A"}
                        </div>
                        {list.method === "web3" ? (
                          <>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              Address: {list.address || "N/A"}
                            </p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              Transaction Hash: {list.tx_hash || "N/A"}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              Bank Name: {list.bank_name || "N/A"}
                            </p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              Acc No: {list.account_number || "N/A"}
                            </p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              Acc Name: {list.account_name || "N/A"}
                            </p>
                          </>
                        )}

                        {list.currency && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Currency: {list.currency}
                          </div>
                        )}
                        <div
                          className={`text-xs ${list.status === "approved" ? "text-green-500" : list.status === "pending" ? "text-yellow-500" : "text-red-500"} dark:text-gray-400`}
                        >
                          Status: {list.status}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Created At: {formatDate(list.createdAt.toString())}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {list.conversion_id.length > 0
                            ? `Conversion IDs: ${list.conversion_id.join(", ")}`
                            : "No Conversion IDs"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          (Net): {formatPrice(list.amount_net)}
                        </p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          Total: {formatPrice(list.amount_total)}
                        </p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          (Fee): {list.percent_fee}%
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          User: {list.user_id?.username || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {list.user_id?.email || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {list.user_id?._id || "N/A"}
                        </div>
                      </td>
                      <td className="space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <button
                          onClick={() => {
                            setOpenModal(list);
                            setForm({
                              id: list._id,
                              file: null,
                              status: list.status,
                            });
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {list.status === "pending" ? "Update" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tags display for debugging */}
            {Number(lists?.pagination.total) > 0 && lists && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {/* Sample tags: {offers.} */}
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!hasPrevPage}
                    className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!hasNextPage}
                    className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {Number(lists?.pagination.total) === 0 && !loading && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No offers found
              </div>
            )}
          </>
        )}

        <Modal
          isOpen={Boolean(openModal)}
          onClose={function (): void {
            setOpenModal(false);
          }}
          className="max-w-[600px] p-5 lg:p-10"
        >
          <div className="space-y-6">
            <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
              Check Request Withdraw
            </h4>
            <div className="overflow-auto">
              <table>
                <thead>
                  <tr>
                    <th className="border px-4 py-2 text-left">
                      Conversion ID
                    </th>
                    <th className="border px-4 py-2 text-left">Detail</th>
                    <th className="border px-4 py-2 text-left">Sale Amount</th>
                    <th className="border px-4 py-2 text-left">Payout</th>
                    <th className="border px-4 py-2 text-left">Status</th>
                    <th className="border px-4 py-2 text-left">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {getDetailConversionWithdraw?.map(
                    (item: {
                      conversion_id: number;
                      sale_amount: string;
                      currency: string;
                      payout: string;
                      adv_sub2: string;
                      conversion_status: string;
                    }) => (
                      <tr key={item.conversion_id}>
                        <td className="border px-4 py-2">
                          {item.conversion_id}
                        </td>
                        <td className="max-w-[200px] overflow-auto border px-4 py-2">
                          <p className="text-nowrap">{item.adv_sub2}</p>
                        </td>

                        <td className="border px-4 py-2">
                          {item.currency !== "USDC" && item.currency !== "USDT"
                            ? formatPrice(
                                Number(item.sale_amount),
                                item.currency,
                              )
                            : item.payout + " " + item.currency}
                        </td>
                        <td className="border px-4 py-2">
                          {item.currency !== "USDC" && item.currency !== "USDT"
                            ? formatPrice(Number(item.payout), item.currency)
                            : item.payout + " " + item.currency}
                        </td>
                        <td className="border px-4 py-2">
                          {item.conversion_status}
                        </td>
                        <td className="border px-4 py-2">{item.currency}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <h1 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
              Total Payout:{" "}
              {(openModal as DataWithdrawsList).currency !== "USDC" &&
              (openModal as DataWithdrawsList).currency !== "USDT"
                ? formatPrice(
                    (openModal as DataWithdrawsList)?.amount_net,
                    (openModal as DataWithdrawsList)?.currency,
                  )
                : (openModal as DataWithdrawsList)?.amount_net +
                  " " +
                  (openModal as DataWithdrawsList)?.currency}
            </h1>
            <Input type="file" name="file" onChange={handleFileChange} />
            {(form.file || (openModal as DataWithdrawsList).slip_file) && (
              <div className="mt-4 mb-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview:
                </p>
                <img
                  src={
                    form.file
                      ? URL.createObjectURL(form.file)
                      : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as DataWithdrawsList).slip_file}`
                  }
                  alt="Preview"
                  className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
            <Select
              options={[
                { label: "Approve", value: "approved" },
                { label: "Reject", value: "rejected" },
                { label: "Pending", value: "pending" },
              ]}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  status: e,
                }));
              }}
              defaultValue={
                form.status ||
                ((openModal &&
                  (openModal as DataWithdrawsList).status) as string)
              }
              placeholder="Select Status"
            />
          </div>

          <div className="mt-8 flex w-full items-center justify-end gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenModal(false)}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={isLoading}
              onClick={() => {
                if (
                  (openModal && (openModal as DataWithdrawsList).method) ===
                  "bank_transfer"
                ) {
                  handleSave();
                } else {
                  toast.error("Only bank transfer method can be updated.");
                }
              }}
              startIcon={
                isLoading ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-600"></div>
                ) : null
              }
            >
              Save Changes
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
