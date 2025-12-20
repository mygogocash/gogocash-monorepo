/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useApi } from "@/hooks/useApi";
import { Offer, OfferRequestForm, OffersQuery } from "@/types/api";
import { useSession } from "next-auth/react";
import FormOffer from "./FormOffer";

export default function OffersTable() {
  const [openModal, setOpenModal] = useState<Offer | boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<OfferRequestForm>({
    logo_desktop: null,
    logo_mobile: null,
    banner: null,
    logo_circle: null,
    offer_name_display: "",
    disabled: false,
    id: "",
  });
  const { data } = useSession();
  const session = data as { accessToken?: string };

  const {
    loading,
    error,
    getOffers,
    deleteOffer,
    clearError,
    updateListOffer,
    setLoading,
  } = useApi();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [query, setQuery] = useState<OffersQuery>({
    search: "",
    limit: 10,
    page: 1,
  });

  // Fetch offers
  const fetchOffers = async (newQuery?: OffersQuery) => {
    try {
      const queryToUse = newQuery || query;
      const response = await getOffers(queryToUse);
      setOffers(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
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
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      await deleteOffer(offerId);
      fetchOffers(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete offer:", err);
    }
  };

  // Format date
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format price
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <FormOffer
        fetchOffers={fetchOffers}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Offers
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {pagination.total} offers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setLoading(true);
              updateListOffer(
                (session as { accessToken?: string })?.accessToken || "",
              )
                .then(() => fetchOffers())
                .finally(() => setLoading(false));
            }}
            className="shadow-theme-xs flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 lg:inline-flex lg:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            Update Offer
          </button>
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
                      Offer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Logo desktop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Logo mobile
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Bannner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Logo circle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {offers.map((offer, index) => (
                    <tr
                      key={offer._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            {offer.logo ? (
                              <Image
                                className="h-12 w-12 rounded-lg object-cover"
                                src={offer.logo}
                                alt={offer.offer_name}
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-300">
                                <span className="text-xs font-medium text-gray-700">
                                  {offer.offer_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {offer.offer_name}
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              New Name:{" "}
                              {offer.offer_name_display
                                ? offer.offer_name_display
                                : "N/A"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {offer.description
                                ? offer.description.substring(0, 50) +
                                  (offer.description.length > 50 ? "..." : "")
                                : "No description"}
                            </div>
                            {offer.disabled && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                Disabled:{" "}
                                {offer.disabled ? "Disabled" : "Enabled"}
                              </div>
                            )}
                            {offer.categories && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                {offer.categories}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={`${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${offer.logo_desktop}`}
                              alt={offer.offer_name}
                              width={48}
                              height={48}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={`${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${offer.logo_mobile}`}
                              alt={offer.offer_name}
                              width={48}
                              height={48}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={`${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${offer.banner}`}
                              alt={offer.offer_name}
                              width={48}
                              height={48}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={`${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${offer.logo_circle}`}
                              alt={offer.offer_name}
                              width={48}
                              height={48}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {offer.categories || "Uncategorized"}
                        </div>
                        {offer.currency && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Currency: {offer.currency}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            offer.tracking_type === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : offer.tracking_type === "expired"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {offer.tracking_type || "Active"}
                        </span>
                      </td>
                      <td className="space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <button
                          onClick={() => {
                            setOpenModal(offer);
                            setForm({
                              logo_desktop: null,
                              logo_mobile: null,
                              id: offer._id,
                              offer_name_display:
                                offer.offer_name_display || offer.offer_name,
                              banner: null,
                              logo_circle: null,
                              disabled: false,
                            });
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(offer._id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tags display for debugging */}
            {offers.length > 0 && offers && (
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

            {offers.length === 0 && !loading && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No offers found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
