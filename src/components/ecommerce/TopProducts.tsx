"use client";

import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Modal } from "../ui/modal";
import { MoreDotIcon } from "@/icons";
import { formatDate, formatTime } from "@/lib/dateFormat";
import { formatMoney } from "@/lib/currencyFormat";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";

export type ProductTimeFrame = {
  label: string;
  start: string;
  end: string;
};

export type TopProductRow = {
  id: string;
  brand: string;
  imageUrl: string;
  name: string;
  productType: string;
  price: number;
  currency: string;
  timeFrames: ProductTimeFrame[];
};

const MOCK_TOP_PRODUCTS: TopProductRow[] = [
  {
    id: "1",
    brand: "LazMall Official",
    imageUrl: "https://placehold.co/80x80/e0e7ff/465fff/png?text=P1",
    name: "Wireless earbuds Pro",
    productType: "Electronics",
    price: 2490,
    currency: "THB",
    timeFrames: [
      {
        label: "Campaign window",
        start: "2026-04-01T00:00:00+07:00",
        end: "2026-04-30T23:59:59+07:00",
      },
      {
        label: "Flash sale slot",
        start: "2026-04-03T10:00:00+07:00",
        end: "2026-04-03T14:00:00+07:00",
      },
    ],
  },
  {
    id: "2",
    brand: "Shopee Choice",
    imageUrl: "https://placehold.co/80x80/dcfce7/10b981/png?text=P2",
    name: "Stainless bottle 1L",
    productType: "Home & living",
    price: 459,
    currency: "THB",
    timeFrames: [
      {
        label: "Listed period",
        start: "2026-03-15T09:00:00+07:00",
        end: "2026-06-15T23:59:59+07:00",
      },
    ],
  },
  {
    id: "3",
    brand: "Central Retail",
    imageUrl: "https://placehold.co/80x80/fef3c7/f59e0b/png?text=P3",
    name: "Running shoes — Men",
    productType: "Fashion",
    price: 3290,
    currency: "THB",
    timeFrames: [
      {
        label: "Promo eligibility",
        start: "2026-04-01T00:00:00+07:00",
        end: "2026-04-07T23:59:59+07:00",
      },
      {
        label: "Price lock",
        start: "2026-04-02T08:30:00+07:00",
        end: "2026-04-02T20:45:00+07:00",
      },
    ],
  },
  {
    id: "4",
    brand: "Big C Online",
    imageUrl: "https://placehold.co/80x80/fce7f3/ec4899/png?text=P4",
    name: "Snack bundle pack",
    productType: "Groceries",
    price: 199,
    currency: "THB",
    timeFrames: [
      {
        label: "Tracking window",
        start: "2026-04-03T00:00:00+07:00",
        end: "2026-04-03T23:59:59+07:00",
      },
    ],
  },
];

function formatPrice(value: number, currency: string): string {
  return formatMoney(value, currency, { decimals: 0 });
}

function formatDateTime(iso: string): { date: string; time: string } {
  return { date: formatDate(iso), time: formatTime(iso) };
}

export default function TopProducts() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [detail, setDetail] = useState<TopProductRow | null>(null);

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="shadow-default rounded-2xl bg-white px-5 pt-5 pb-5 sm:px-6 sm:pt-6 dark:bg-gray-900">
          <div className="flex justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Top products
              </h3>
              <p className="text-theme-sm mt-1 font-normal text-gray-500 dark:text-gray-400">
                Best-performing offers by brand — open View for time &amp; date
                windows
              </p>
            </div>
            <div className="relative inline-block shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="dropdown-toggle rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-white/5"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
              </button>
              <Dropdown
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                className="w-40 p-2"
              >
                <DropdownItem
                  tag="button"
                  onItemClick={() => setMenuOpen(false)}
                  className="flex w-full rounded-lg px-3 py-2 text-left font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                >
                  Export CSV
                </DropdownItem>
                <DropdownItem
                  tag="button"
                  onItemClick={() => setMenuOpen(false)}
                  className="flex w-full rounded-lg px-3 py-2 text-left font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                >
                  Refresh
                </DropdownItem>
              </Dropdown>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
              <thead>
                <tr className="text-theme-xs border-b border-gray-100 bg-gray-50 font-semibold tracking-wide text-gray-500 uppercase dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-400">
                  <th className="px-3 py-3 sm:px-4">Brand</th>
                  <th className="w-[88px] px-3 py-3 sm:px-4">Image</th>
                  <th className="px-3 py-3 sm:px-4">Product</th>
                  <th className="px-3 py-3 sm:px-4">Type</th>
                  <th className="px-3 py-3 sm:px-4">Price</th>
                  <th className="w-[100px] px-3 py-3 text-center sm:px-4">
                    View
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {MOCK_TOP_PRODUCTS.map((row) => (
                  <tr
                    key={row.id}
                    className="text-theme-sm text-gray-800 transition-colors hover:bg-gray-50/80 dark:text-white/90 dark:hover:bg-white/[0.04]"
                  >
                    <td className="px-3 py-3 align-middle sm:px-4">
                      <span className="font-medium">{row.brand}</span>
                    </td>
                    <td className="px-3 py-3 align-middle sm:px-4">
                      <RemoteOrBlobImage
                        src={row.imageUrl}
                        alt={row.name}
                        width={40}
                        height={40}
                        className="size-10 rounded-lg object-cover ring-1 ring-gray-100 dark:ring-gray-700"
                      />
                    </td>
                    <td className="px-3 py-3 align-middle sm:px-4">
                      <span className="line-clamp-2">{row.name}</span>
                    </td>
                    <td className="px-3 py-3 align-middle text-gray-600 sm:px-4 dark:text-gray-300">
                      {row.productType}
                    </td>
                    <td className="px-3 py-3 align-middle font-medium sm:px-4">
                      {formatPrice(row.price, row.currency)}
                    </td>
                    <td className="px-3 py-3 text-center align-middle sm:px-4">
                      <button
                        type="button"
                        onClick={() => setDetail(row)}
                        className="border-brand-500 text-brand-600 shadow-theme-xs hover:bg-brand-50 dark:border-brand-600 dark:text-brand-400 dark:hover:bg-brand-950/40 inline-flex items-center justify-center rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold dark:bg-gray-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4">
          <p className="text-theme-xs text-center text-gray-500 sm:text-sm dark:text-gray-400">
            Mock data for internal dashboard — wire to API when product
            analytics is available.
          </p>
        </div>
      </div>

      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        className="sm:max-w-lg"
      >
        {detail && (
          <div className="p-6 pt-14 sm:p-8 sm:pt-16">
            <div className="flex gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
              <RemoteOrBlobImage
                src={detail.imageUrl}
                alt={detail.name}
                width={80}
                height={80}
                className="size-20 shrink-0 rounded-xl object-cover ring-1 ring-gray-100 dark:ring-gray-700"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  {detail.brand}
                </p>
                <h4 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {detail.name}
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {detail.productType}
                </p>
                <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
                  {formatPrice(detail.price, detail.currency)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Time frames
              </h5>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Reporting and promotional windows (date &amp; time, GMT+7).
              </p>
              <ul className="mt-4 space-y-4">
                {detail.timeFrames.map((tf) => {
                  const start = formatDateTime(tf.start);
                  const end = formatDateTime(tf.end);
                  return (
                    <li
                      key={`${detail.id}-${tf.label}`}
                      className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.04]"
                    >
                      <p className="text-brand-600 dark:text-brand-400 text-xs font-semibold tracking-wide uppercase">
                        {tf.label}
                      </p>
                      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">
                            From (date)
                          </dt>
                          <dd className="mt-0.5 font-medium text-gray-800 dark:text-white/90">
                            {start.date}
                          </dd>
                          <dt className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            From (time)
                          </dt>
                          <dd className="mt-0.5 font-mono text-gray-700 dark:text-gray-300">
                            {start.time}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">
                            To (date)
                          </dt>
                          <dd className="mt-0.5 font-medium text-gray-800 dark:text-white/90">
                            {end.date}
                          </dd>
                          <dt className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            To (time)
                          </dt>
                          <dd className="mt-0.5 font-mono text-gray-700 dark:text-gray-300">
                            {end.time}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
