"use client";

import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";

const REWARD_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
] as const;

type RewardStatus = (typeof REWARD_STATUS_OPTIONS)[number]["value"];

export default function CreateRewardForm() {
  const [rewardName, setRewardName] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardCurrency, setRewardCurrency] = useState("THB");
  const [rewardUser, setRewardUser] = useState("");
  const [rewardStatus, setRewardStatus] = useState<RewardStatus>("pending");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: would call API to create reward
    alert(
      "Create Reward (mock): " +
        JSON.stringify({
          rewardName,
          rewardAmount,
          rewardCurrency,
          rewardUser,
          status: rewardStatus,
        }),
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-6 py-5">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          Create Reward
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create a new reward. Set the name, amount, currency, recipient, and admin status (pending or approved).
        </p>
      </div>
      <form onSubmit={handleSubmit} className="border-t border-gray-100 px-6 py-6 dark:border-gray-800">
        <div className="space-y-6 max-w-md">
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
              <strong>Pending</strong> — awaiting review. <strong>Approved</strong> — confirmed by admin for payout or crediting.
            </p>
            <select
              id="reward-status"
              value={rewardStatus}
              onChange={(e) => setRewardStatus(e.target.value as RewardStatus)}
              className="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 mt-2 h-11 w-full max-w-md appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {REWARD_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg border border-brand-500 bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            Create Reward
          </button>
        </div>
      </form>
    </div>
  );
}
