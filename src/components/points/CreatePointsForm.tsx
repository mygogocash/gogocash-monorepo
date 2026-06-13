"use client";

import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";

const POINT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
] as const;

type PointStatus = (typeof POINT_STATUS_OPTIONS)[number]["value"];

/**
 * UI stub mirroring CreateRewardForm — same fields, same UX, "Point"
 * terminology. The reward form is also a stub today (handleSubmit is a
 * placeholder `alert()`); when the reward backend wires up, this form's
 * submit handler should be updated in lockstep to call the equivalent
 * Points endpoint.
 */
export default function CreatePointsForm() {
  const [pointName, setPointName] = useState("");
  const [pointAmount, setPointAmount] = useState("");
  const [pointUser, setPointUser] = useState("");
  const [pointStatus, setPointStatus] = useState<PointStatus>("pending");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewConfirmed) return;
    // Placeholder: would call API to create points
    alert(
      "Create Points (mock): " +
        JSON.stringify({
          pointName,
          pointAmount,
          pointUser,
          status: pointStatus,
        }),
    );
    setReviewConfirmed(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-6 py-5">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          Create Points
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create new points. Set the name, amount, recipient, and admin status (pending or approved).
        </p>
      </div>
      <form onSubmit={handleSubmit} className="border-t border-gray-100 px-6 py-6 dark:border-gray-800">
        <div className="space-y-6 max-w-md">
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
              <strong>Pending</strong> — awaiting review. <strong>Approved</strong> — confirmed by admin for crediting.
            </p>
            <select
              id="point-status"
              value={pointStatus}
              onChange={(e) => setPointStatus(e.target.value as PointStatus)}
              className="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 mt-2 h-11 w-full max-w-md appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {POINT_STATUS_OPTIONS.map((opt) => (
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
          <button
            type="submit"
            disabled={!reviewConfirmed}
            className="rounded-lg border border-brand-500 bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:pointer-events-none disabled:opacity-45 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            Create Points
          </button>
        </div>
      </form>
    </div>
  );
}
