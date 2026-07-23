"use client";

import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import { PointTransactionSummaryTable } from "@/components/points/PointTransactionSummaryTable";
import { useSession } from "next-auth/react";
import {
  ADMIN_PAYOUT_STATUS_HELP_POINTS,
  ADMIN_PAYOUT_STATUS_OPTIONS,
  type AdminPayoutStatus,
} from "@/lib/adminPayoutStatus";
import apiClient from "@/lib/api";
import { parseAmount } from "@/lib/formValidation";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  appendPointTransaction,
  buildPointTransactionRecord,
} from "@/lib/pointTransactionStorage";

export default function CreatePointsForm() {
  const { status } = useSession();
  const [pointName, setPointName] = useState("");
  const [pointAmount, setPointAmount] = useState("");
  const [pointUser, setPointUser] = useState("");
  const [pointStatus, setPointStatus] = useState<AdminPayoutStatus>("Pending");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableRefreshToken, setTableRefreshToken] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewConfirmed || isSubmitting) return;

    setSubmitError(null);
    setSubmitSuccess(null);

    const trimmedName = pointName.trim();
    const trimmedUser = pointUser.trim();
    const amount = parseAmount(pointAmount);

    if (!trimmedName) {
      setSubmitError("Point name is required.");
      return;
    }
    if (amount == null || amount <= 0) {
      setSubmitError("Enter a valid point amount greater than zero.");
      return;
    }
    if (!trimmedUser) {
      setSubmitError("Point user email or mobile is required.");
      return;
    }

    if (status !== "authenticated") {
      setSubmitError("You must be signed in to create points.");
      return;
    }

    setIsSubmitting(true);
    let apiSuccess = false;
    let errorMessage: string | undefined;
    const skipApi = pointStatus === "Fail";

    if (!skipApi) {
      try {
        await apiClient.createAdminPoint({
          point_name: trimmedName,
          point_amount: amount,
          user: trimmedUser,
        });
        apiSuccess = true;
      } catch (error) {
        errorMessage = getApiErrorMessage(error, "Failed to create points");
      }
    }

    appendPointTransaction(
      buildPointTransactionRecord({
        pointName: trimmedName,
        pointAmount: amount,
        pointUser: trimmedUser,
        formStatus: pointStatus,
        apiSuccess: skipApi ? false : apiSuccess,
        errorMessage,
      }),
    );
    setTableRefreshToken((value) => value + 1);

    const recordedStatus = skipApi || !apiSuccess ? "Fail" : pointStatus;

    if (skipApi) {
      setSubmitSuccess("Points recorded with Fail status.");
      setReviewConfirmed(false);
    } else if (apiSuccess) {
      setSubmitSuccess(`Points created with status ${recordedStatus}.`);
      setReviewConfirmed(false);
    } else {
      setSubmitError(errorMessage ?? "Failed to create points");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-6 py-5">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          Create Points
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create new points. Set the name, amount, recipient, and payout status.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-100 px-6 py-6 dark:border-gray-800"
      >
        <div className="max-w-md space-y-6">
          <div>
            <Label>
              Point Name <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Display name for the points (e.g. Quest 202602, Ang Pao 202602).
            </p>
            <Input
              placeholder="Ex.[Quest (202602), Ang Pao (202602), etc]"
              type="text"
              value={pointName}
              onChange={(e) => setPointName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>
              Point Amount <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Numeric value of the points (e.g. 50, 100).
            </p>
            <Input
              placeholder="0"
              type="number"
              value={pointAmount}
              onChange={(e) => setPointAmount(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>
              Point User <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Email or mobile of the user who receives these points.
            </p>
            <Input
              placeholder="Ex.[email or mobile]"
              type="text"
              value={pointUser}
              onChange={(e) => setPointUser(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="point-status">
              Status <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {ADMIN_PAYOUT_STATUS_HELP_POINTS}
            </p>
            <select
              id="point-status"
              value={pointStatus}
              onChange={(e) =>
                setPointStatus(e.target.value as AdminPayoutStatus)
              }
              className="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 mt-2 h-11 w-full max-w-md appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {ADMIN_PAYOUT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <Checkbox
              id="point-review-confirmed"
              checked={reviewConfirmed}
              onChange={setReviewConfirmed}
              label="I have reviewed these points and confirm the details are correct"
            />
            <p className="mt-2 pl-8 text-xs text-gray-500 dark:text-gray-400">
              You must check this box before creating the points.
            </p>
          </div>
          {submitError ? (
            <p className="text-sm text-error-600 dark:text-error-400">
              {submitError}
            </p>
          ) : null}
          {submitSuccess ? (
            <p className="text-sm text-success-600 dark:text-success-400">
              {submitSuccess}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!reviewConfirmed || isSubmitting}
            className="rounded-lg border border-brand-500 bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:pointer-events-none disabled:opacity-45 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {isSubmitting ? "Creating…" : "Create Points"}
          </button>
        </div>
      </form>
      <PointTransactionSummaryTable refreshToken={tableRefreshToken} />
    </div>
  );
}
