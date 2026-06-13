"use client";

/**
 * Blocking email-link modal for MiniPay users.
 *
 * Rendered by {@link MiniPayWithdrawRequestForm} (and any future MiniPay
 * action that needs a contact address) when `session.user.email` is empty.
 * Not dismissible — no close button, no backdrop-click, no ESC handler —
 * because the API side of the withdraw request also rejects a user without
 * an email (see `withdraw.service.ts::createManualWithdrawRequest`). Once
 * the user saves an email, we call `session.update()` so the parent form
 * re-reads an authenticated, email-present session and proceeds.
 */

import { fetcher, fetcherPut } from "@/lib/axios/client";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import toast from "react-hot-toast";

/** Minimum viable email shape — server does stricter validation. */
function isEmailShape(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function MiniPayEmailModal() {
  const t = useTranslations();
  const { data: session, update } = useSession();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isEmailShape(trimmed)) {
      setError(t("minipayEmailInvalidError"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await fetcherPut([`/user/profile`, { data: { email: trimmed } }]);
      // Re-fetch the server-authoritative profile rather than trusting the
      // locally typed value — if the API normalised (e.g. lowercased) the
      // address, or a concurrent write changed it, the session must reflect
      // what was actually persisted.
      let persistedEmail = trimmed;
      try {
        const profile = (await fetcher(`/user/profile`)) as {
          email?: string;
        } | null;
        if (profile && typeof profile.email === "string" && profile.email.trim()) {
          persistedEmail = profile.email;
        }
      } catch {
        // Non-fatal — fall through with the trimmed value we just PUT.
      }
      await update({
        ...session,
        user: { ...session?.user, email: persistedEmail },
      });
      toast.success(t("minipayEmailSavedToast"));
      // Parent re-renders and hides this modal once session reflects the new email.
    } catch {
      toast.error(t("minipayEmailSaveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="minipay-email-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4"
    >
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-[400px] flex-col gap-4 rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="minipay-email-modal-title"
            className="text-[18px] font-semibold leading-snug text-[#103522]"
          >
            {t("minipayEmailModalTitle")}
          </h2>
          <p className="text-[14px] leading-relaxed text-[#5B6B61]">
            {t("minipayEmailModalDescription")}
          </p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#103522]">{t("minipayEmailLabel")}</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("minipayEmailPlaceholder")}
            aria-invalid={Boolean(error) || undefined}
            className={[
              "h-[52px] w-full rounded-2xl border bg-white px-4 text-[15px] text-[#103522] outline-none transition",
              error
                ? "border-[#CD0D0D] focus:border-[#CD0D0D] focus:ring-2 focus:ring-[#CD0D0D]/20"
                : "border-[#E4EAE6] focus:border-[#00CC99] focus:ring-2 focus:ring-[#00CC99]/20",
            ].join(" ")}
            autoFocus
          />
          {error ? <span className="text-[13px] leading-snug text-[#CD0D0D]">{error}</span> : null}
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 items-center justify-center rounded-full bg-[#00CC99] px-6 text-[15px] font-semibold text-white transition hover:brightness-[0.98] active:brightness-[0.95] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? t("minipayEmailSaving") : t("minipayEmailContinue")}
        </button>
      </form>
    </div>
  );
}
