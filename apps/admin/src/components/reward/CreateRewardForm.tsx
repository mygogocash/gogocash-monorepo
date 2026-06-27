"use client";

import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import { RewardTransactionSummaryTable } from "@/components/reward/RewardTransactionSummaryTable";
import { useDataSession } from "@/hooks/useDataSession";
import apiClient from "@/lib/api";
import { parseAmount } from "@/lib/formValidation";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  ADMIN_PAYOUT_STATUS_HELP_REWARD,
  ADMIN_PAYOUT_STATUS_OPTIONS,
} from "@/lib/adminPayoutStatus";
import {
  appendRewardTransaction,
  buildRewardTransactionRecord,
  type RewardPayoutStatus,
} from "@/lib/rewardTransactionStorage";

const ALLOWED_CURRENCIES = new Set(["THB", "USD"]);

export default function CreateRewardForm() {
  const session = useDataSession();
  const [rewardName, setRewardName] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardCurrency, setRewardCurrency] = useState("THB");
  const [rewardUser, setRewardUser] = useState("");
  const [rewardStatus, setRewardStatus] = useState<RewardPayoutStatus>("Pending");
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

    const trimmedName = rewardName.trim();
    const trimmedUser = rewardUser.trim();
    const currency = rewardCurrency.trim().toUpperCase();
    const amount = parseAmount(rewardAmount);

    if (!trimmedName) {
      setSubmitError("Reward name is required.");
      return;
    }
    if (amount == null || amount <= 0) {
      setSubmitError("Enter a valid reward amount greater than zero.");
      return;
    }
    if (!ALLOWED_CURRENCIES.has(currency)) {
      setSubmitError("Reward currency must be THB or USD.");
      return;
    }
    if (!trimmedUser) {
      setSubmitError("Reward user email or mobile is required.");
      return;
    }

    const token = session.accessToken;
    if (!token) {
      setSubmitError("You must be signed in to create a reward.");
      return;
    }

    setIsSubmitting(true);
    let apiSuccess = false;
    let errorMessage: string | undefined;
    const skipApi = rewardStatus === "Fail";

    if (!skipApi) {
      try {
        await apiClient.createConversionReward(
          {
            reward_type: trimmedName,
            reward_amount: amount,
            reward_currency: currency,
            user: trimmedUser,
          },
          token,
        );
        apiSuccess = true;
      } catch (error) {
        errorMessage = getApiErrorMessage(error, "Failed to create reward");
      }
    }

    appendRewardTransaction(
      buildRewardTransactionRecord({
        rewardName: trimmedName,
        rewardAmount: amount,
        rewardCurrency: currency,
        rewardUser: trimmedUser,
        formStatus: rewardStatus,
        apiSuccess: skipApi ? false : apiSuccess,
        errorMessage,
      }),
    );
    setTableRefreshToken((value) => value + 1);

    const recordedStatus = skipApi || !apiSuccess ? "Fail" : rewardStatus;

    if (skipApi) {
      setSubmitSuccess("Reward recorded with Fail status.");
      setReviewConfirmed(false);
    } else if (apiSuccess) {
      setSubmitSuccess(`Reward created with status ${recordedStatus}.`);
      setReviewConfirmed(false);
    } else {
      setSubmitError(errorMessage ?? "Failed to create reward");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-6 py-5">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          Create Reward
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create a new reward. Set the name, amount, currency, recipient, and
          payout status.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-100 px-6 py-6 dark:border-gray-800"
      >
        <div className="max-w-md space-y-6">
          <div>
            <Label>
              Reward Name <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Display name for the reward (e.g. Quest 202602, Ang Pao 202602).
            </p>
            <Input
              placeholder="Ex.[Quest (202602), Ang Pao (202602), etc]"
              type="text"
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>
              Reward Amount <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Numeric value of the reward (e.g. 50, 100).
            </p>
            <Input
              placeholder="0"
              type="number"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>
              Reward Currency <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Currency code for the amount (e.g. THB, USD).
            </p>
            <Input
              placeholder="Ex.[THB, USD]"
              type="text"
              value={rewardCurrency}
              onChange={(e) => setRewardCurrency(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>
              Reward User <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Email or mobile of the user who receives this reward.
            </p>
            <Input
              placeholder="Ex.[email or mobile]"
              type="text"
              value={rewardUser}
              onChange={(e) => setRewardUser(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="reward-status">
              Status <span className="text-error-500">*</span>
            </Label>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {ADMIN_PAYOUT_STATUS_HELP_REWARD}
            </p>
            <select
              id="reward-status"
              value={rewardStatus}
              onChange={(e) =>
                setRewardStatus(e.target.value as RewardPayoutStatus)
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
              id="reward-review-confirmed"
              checked={reviewConfirmed}
              onChange={setReviewConfirmed}
              label="I have reviewed this reward and confirm the details are correct"
            />
            <p className="mt-2 pl-8 text-xs text-gray-500 dark:text-gray-400">
              You must check this box before creating the reward.
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
            {isSubmitting ? "Creating…" : "Create Reward"}
          </button>
        </div>
      </form>
      <RewardTransactionSummaryTable refreshToken={tableRefreshToken} />
    </div>
  );
}
