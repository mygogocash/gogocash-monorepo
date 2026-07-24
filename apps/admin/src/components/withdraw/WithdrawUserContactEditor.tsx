"use client";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import TextButton from "@/components/ui/button/TextButton";
import { VerifiedPill } from "@/components/withdraw/VerifiedPill";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  sendWithdrawUserContactOtp,
  verifyWithdrawUserContactOtp,
} from "@/lib/api/withdrawUserContactApi";
import {
  MAX_WITHDRAW_CONTACT_ROWS,
  contactRowVerified,
  createContactRow,
  ensureUserContactRows,
  mergeContactValue,
  rowNeedsOtp,
  type WithdrawUserEditDraft,
} from "@/lib/withdrawUserContactState";
import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

type Props = {
  userId: string;
  showMockOtpHint: boolean;
  userDraft: WithdrawUserEditDraft;
  setUserDraft: Dispatch<SetStateAction<WithdrawUserEditDraft>>;
  initialEmails: ReadonlySet<string>;
  initialMobiles: ReadonlySet<string>;
  /** Whether the user's email channel was already verified on file. */
  initialEmailVerified: boolean;
  /** Whether the user's phone channel was already verified on file. */
  initialMobileVerified: boolean;
};

export default function WithdrawUserContactEditor({
  userId,
  showMockOtpHint,
  userDraft,
  setUserDraft,
  initialEmails,
  initialMobiles,
  initialEmailVerified,
  initialMobileVerified,
}: Props) {
  const sendContactOtp = useCallback(
    async (kind: "email" | "mobile", index: number, rawTarget: string) => {
      if (!userId) return;
      const rowKey =
        kind === "email" ? ("emailRows" as const) : ("mobileRows" as const);
      const target = rawTarget.trim();
      if (!target) return;
      setUserDraft((d) => {
        const rows = [...ensureUserContactRows(d[rowKey])];
        if (!rows[index]) return d;
        rows[index] = { ...rows[index], otpBusy: "sending", contactMsg: null };
        return { ...d, [rowKey]: rows };
      });
      try {
        const body = await sendWithdrawUserContactOtp({
          userId,
          channel: kind,
          target,
        });
        const hint =
          showMockOtpHint && body.demoCode
            ? `Code sent. Enter OTP: ${body.demoCode} (mock)`
            : (body.message ?? "OTP sent");
        setUserDraft((d) => {
          const rows = [...ensureUserContactRows(d[rowKey])];
          if (!rows[index]) return d;
          rows[index] = { ...rows[index], otpBusy: "idle", contactMsg: hint };
          return { ...d, [rowKey]: rows };
        });
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e, "Failed to send OTP");
        setUserDraft((d) => {
          const rows = [...ensureUserContactRows(d[rowKey])];
          if (!rows[index]) return d;
          rows[index] = { ...rows[index], otpBusy: "idle", contactMsg: msg };
          return { ...d, [rowKey]: rows };
        });
      }
    },
    [userId, showMockOtpHint, setUserDraft],
  );

  const verifyContactOtp = useCallback(
    async (
      kind: "email" | "mobile",
      index: number,
      rawTarget: string,
      otp: string,
    ) => {
      if (!userId) return;
      const rowKey =
        kind === "email" ? ("emailRows" as const) : ("mobileRows" as const);
      const target = rawTarget.trim();
      const code = otp.trim();
      if (!target || !code) return;
      setUserDraft((d) => {
        const rows = [...ensureUserContactRows(d[rowKey])];
        if (!rows[index]) return d;
        rows[index] = {
          ...rows[index],
          otpBusy: "verifying",
          contactMsg: null,
        };
        return { ...d, [rowKey]: rows };
      });
      try {
        await verifyWithdrawUserContactOtp({
          userId,
          channel: kind,
          target,
          otp: code,
        });
        setUserDraft((d) => {
          const rows = [...ensureUserContactRows(d[rowKey])];
          if (!rows[index]) return d;
          rows[index] = {
            ...rows[index],
            otpVerified: true,
            otpInput: "",
            otpBusy: "idle",
            contactMsg: "Verified",
          };
          return { ...d, [rowKey]: rows };
        });
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e, "Invalid OTP");
        setUserDraft((d) => {
          const rows = [...ensureUserContactRows(d[rowKey])];
          if (!rows[index]) return d;
          rows[index] = { ...rows[index], otpBusy: "idle", contactMsg: msg };
          return { ...d, [rowKey]: rows };
        });
      }
    },
    [userId, setUserDraft],
  );

  // Removal is confirmed via a dialog rather than deleting on the first click.
  const [pendingRemoval, setPendingRemoval] = useState<{
    kind: "email" | "mobile";
    index: number;
  } | null>(null);

  const confirmRemoval = useCallback(() => {
    if (!pendingRemoval) return;
    const { kind, index } = pendingRemoval;
    const rowKey: "emailRows" | "mobileRows" =
      kind === "email" ? "emailRows" : "mobileRows";
    setUserDraft((d) => {
      const rows = ensureUserContactRows(d[rowKey]);
      const next = rows.filter((_, j) => j !== index);
      return { ...d, [rowKey]: next.length ? next : [createContactRow("")] };
    });
    setPendingRemoval(null);
  }, [pendingRemoval, setUserDraft]);

  return (
    <>
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2 dark:border-gray-700 dark:bg-gray-900/50">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label className="mb-0">Email addresses</Label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Up to {MAX_WITHDRAW_CONTACT_ROWS} · empty rows ignored · new emails
            need OTP
          </span>
        </div>
        <div className="space-y-3">
          {ensureUserContactRows(userDraft.emailRows).map((row, i) => {
            const needsOtp = rowNeedsOtp(row, initialEmails, "email");
            const verified = contactRowVerified(
              row,
              initialEmails,
              "email",
              initialEmailVerified,
            );
            return (
              <div
                key={row.clientId}
                className="space-y-2 rounded-md border border-gray-100 p-2 dark:border-gray-700/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Input
                      id={i === 0 ? "wd-user-email-0" : undefined}
                      type="email"
                      autoComplete="email"
                      value={row.value}
                      onChange={(e) =>
                        setUserDraft((d) => ({
                          ...d,
                          emailRows: ensureUserContactRows(d.emailRows).map(
                            (r, j) =>
                              j === i
                                ? mergeContactValue(
                                    r,
                                    e.target.value,
                                    initialEmails,
                                    "email",
                                  )
                                : r,
                          ),
                        }))
                      }
                      placeholder="name@example.com"
                      className="h-11 min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPendingRemoval({ kind: "email", index: i })
                      }
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Remove
                    </button>
                  </div>
                  {verified && !needsOtp && (
                    <VerifiedPill verified label="Email" />
                  )}
                </div>
                {needsOtp && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <button
                      type="button"
                      disabled={row.otpBusy !== "idle" || !row.value.trim()}
                      onClick={() => void sendContactOtp("email", i, row.value)}
                      className="border-brand-600 text-brand-600 hover:bg-brand-50 dark:border-brand-500 dark:text-brand-400 dark:hover:bg-brand-950/40 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900"
                    >
                      {row.otpBusy === "sending" ? "Sending…" : "Send OTP"}
                    </button>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <Input
                        type="text"
                        autoComplete="one-time-code"
                        placeholder="OTP"
                        value={row.otpInput}
                        onChange={(e) =>
                          setUserDraft((d) => ({
                            ...d,
                            emailRows: ensureUserContactRows(d.emailRows).map(
                              (r, j) =>
                                j === i
                                  ? { ...r, otpInput: e.target.value }
                                  : r,
                            ),
                          }))
                        }
                        className="h-9 w-28 font-mono text-sm"
                      />
                      <button
                        type="button"
                        disabled={
                          row.otpBusy !== "idle" ||
                          !row.otpInput.trim() ||
                          !row.value.trim()
                        }
                        onClick={() =>
                          void verifyContactOtp(
                            "email",
                            i,
                            row.value,
                            row.otpInput,
                          )
                        }
                        className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {row.otpBusy === "verifying" ? "Verifying…" : "Verify"}
                      </button>
                    </div>
                  </div>
                )}
                {row.contactMsg && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {row.contactMsg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <TextButton
          disabled={
            ensureUserContactRows(userDraft.emailRows).length >=
            MAX_WITHDRAW_CONTACT_ROWS
          }
          onClick={() =>
            setUserDraft((d) => ({
              ...d,
              emailRows: [
                ...ensureUserContactRows(d.emailRows),
                createContactRow(""),
              ],
            }))
          }
        >
          + Add email
        </TextButton>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2 dark:border-gray-700 dark:bg-gray-900/50">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label className="mb-0">Phone numbers</Label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Up to {MAX_WITHDRAW_CONTACT_ROWS} · empty rows ignored · new numbers
            need OTP
          </span>
        </div>
        <div className="space-y-3">
          {ensureUserContactRows(userDraft.mobileRows).map((row, i) => {
            const needsOtp = rowNeedsOtp(row, initialMobiles, "mobile");
            const verified = contactRowVerified(
              row,
              initialMobiles,
              "mobile",
              initialMobileVerified,
            );
            return (
              <div
                key={row.clientId}
                className="space-y-2 rounded-md border border-gray-100 p-2 dark:border-gray-700/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Input
                      id={i === 0 ? "wd-user-mobile-0" : undefined}
                      type="tel"
                      autoComplete="tel"
                      value={row.value}
                      onChange={(e) =>
                        setUserDraft((d) => ({
                          ...d,
                          mobileRows: ensureUserContactRows(d.mobileRows).map(
                            (r, j) =>
                              j === i
                                ? mergeContactValue(
                                    r,
                                    e.target.value,
                                    initialMobiles,
                                    "mobile",
                                  )
                                : r,
                          ),
                        }))
                      }
                      placeholder="+66…"
                      className="h-11 min-w-0 flex-1 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPendingRemoval({ kind: "mobile", index: i })
                      }
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Remove
                    </button>
                  </div>
                  {verified && !needsOtp && (
                    <VerifiedPill verified label="Phone" />
                  )}
                </div>
                {needsOtp && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <button
                      type="button"
                      disabled={row.otpBusy !== "idle" || !row.value.trim()}
                      onClick={() =>
                        void sendContactOtp("mobile", i, row.value)
                      }
                      className="border-brand-600 text-brand-600 hover:bg-brand-50 dark:border-brand-500 dark:text-brand-400 dark:hover:bg-brand-950/40 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900"
                    >
                      {row.otpBusy === "sending" ? "Sending…" : "Send OTP"}
                    </button>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <Input
                        type="text"
                        autoComplete="one-time-code"
                        placeholder="OTP"
                        value={row.otpInput}
                        onChange={(e) =>
                          setUserDraft((d) => ({
                            ...d,
                            mobileRows: ensureUserContactRows(d.mobileRows).map(
                              (r, j) =>
                                j === i
                                  ? { ...r, otpInput: e.target.value }
                                  : r,
                            ),
                          }))
                        }
                        className="h-9 w-28 font-mono text-sm"
                      />
                      <button
                        type="button"
                        disabled={
                          row.otpBusy !== "idle" ||
                          !row.otpInput.trim() ||
                          !row.value.trim()
                        }
                        onClick={() =>
                          void verifyContactOtp(
                            "mobile",
                            i,
                            row.value,
                            row.otpInput,
                          )
                        }
                        className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {row.otpBusy === "verifying" ? "Verifying…" : "Verify"}
                      </button>
                    </div>
                  </div>
                )}
                {row.contactMsg && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {row.contactMsg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <TextButton
          disabled={
            ensureUserContactRows(userDraft.mobileRows).length >=
            MAX_WITHDRAW_CONTACT_ROWS
          }
          onClick={() =>
            setUserDraft((d) => ({
              ...d,
              mobileRows: [
                ...ensureUserContactRows(d.mobileRows),
                createContactRow(""),
              ],
            }))
          }
        >
          + Add phone
        </TextButton>
      </div>

      <ConfirmDialog
        isOpen={pendingRemoval !== null}
        title="Are you sure to remove this item?"
        description="You cannot undo this action later"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}
