"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";

const OFFER_OPTIONS = [
  { value: "1001", label: "Shopee TH - CPS" },
  { value: "1002", label: "Lazada TH - CPS" },
  { value: "1003", label: "Agoda - CPS" },
  { value: "1004", label: "GrabFood TH" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AddConversionForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [offerId, setOfferId] = useState("1001");
  const [userId, setUserId] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [payout, setPayout] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [status, setStatus] = useState("pending");
  const [orderId, setOrderId] = useState("");
  const [remark, setRemark] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      alert("Please enter User ID");
      return;
    }
    if (!saleAmount.trim() || isNaN(Number(saleAmount)) || Number(saleAmount) <= 0) {
      alert("Please enter a valid Sale amount");
      return;
    }
    if (!payout.trim() || isNaN(Number(payout)) || Number(payout) < 0) {
      alert("Please enter a valid Payout");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/mock/admin/add-conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: Number(offerId),
          aff_sub1: userId.trim(),
          sale_amount: Number(saleAmount).toFixed(2),
          payout: Number(payout).toFixed(2),
          currency,
          conversion_status: status,
          adv_sub2: orderId.trim() || `order_${Date.now()}`,
          remark: remark.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to add conversion");
      }
      alert(data?.message || "Conversion added successfully.");
      router.push("/conversion");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add conversion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          Add conversion
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create a new conversion record. Enter the offer, user, order and amount details below. The record will appear in Created Conversion for status updates.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-100 px-4 py-6 dark:border-gray-800 sm:px-6"
      >
        <div className="grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>
              Offer <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 mb-1 text-xs text-gray-500 dark:text-gray-400">
              Platform or campaign this conversion belongs to.
            </p>
            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {OFFER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>
              User ID <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 mb-1 text-xs text-gray-500 dark:text-gray-400">
              The user who made the purchase or action.
            </p>
            <Input
              placeholder="e.g. u1 or user ID"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>
              Order ID
            </Label>
            <p className="mt-0.5 mb-1 text-xs text-gray-500 dark:text-gray-400">
              Optional reference (e.g. merchant order ID). Auto-generated if left blank.
            </p>
            <Input
              placeholder="e.g. order_001"
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>
              Sale amount <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 mb-1 text-xs text-gray-500 dark:text-gray-400">
              Total sale or transaction amount before commission.
            </p>
            <Input
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0"
              value={saleAmount}
              onChange={(e) => setSaleAmount(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>
              Payout <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 mb-1 text-xs text-gray-500 dark:text-gray-400">
              Commission or payout amount to credit to the user.
            </p>
            <Input
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0"
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Currency</Label>
            <p className="mt-0.5 mb-1 text-xs text-gray-500 dark:text-gray-400">
              Currency for sale amount and payout.
            </p>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="THB">THB</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <p className="mt-0.5 mb-1 text-xs text-gray-500 dark:text-gray-400">
              Initial status (e.g. Pending until verified). You can change it later in Created Conversion.
            </p>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Remark</Label>
            <p className="mt-0.5 mb-1 text-xs text-gray-500 dark:text-gray-400">
              Optional note for internal reference (e.g. source or reason).
            </p>
            <Input
              placeholder="Optional note or remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg border border-brand-500 bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-60 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {submitting ? "Adding…" : "Add conversion"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/conversion")}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
