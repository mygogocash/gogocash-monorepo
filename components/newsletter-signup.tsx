"use client";

import { FormEvent, useId, useState } from "react";
import type { NewsletterSignupConfig } from "@/lib/app-config";
import {
  twFocusRingPrimary,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";
import { uiCtaPrimarySurface } from "@/lib/ui-classes";

type SubmitState = "idle" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterSignup({
  config,
}: {
  config: NewsletterSignupConfig;
}) {
  const emailId = useId();
  const consentId = useId();
  const frameName = useId().replaceAll(":", "");
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const configured = Boolean(config.actionUrl);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    setState("idle");

    if (!configured) {
      event.preventDefault();
      setState("error");
      return;
    }
    if (!EMAIL_RE.test(email.trim()) || !consented) {
      event.preventDefault();
      setState("error");
      return;
    }

    setState("success");
    setEmail("");
    setConsented(false);
  };

  return (
    <section
      aria-labelledby="footer-newsletter-title"
      className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
    >
      <div>
        <h4
          id="footer-newsletter-title"
          className="text-sm font-semibold text-[#1f2937]"
        >
          Get cashback tips and offers
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
          A quiet email digest for cashback tips, featured brands, and new
          GoGoCash offers.
        </p>
      </div>

      <form
        action={config.actionUrl ?? undefined}
        method="post"
        target={frameName}
        noValidate
        aria-label="Get cashback tips and offers by email"
        data-configured={configured ? "true" : "false"}
        className="mt-4 space-y-3"
        onSubmit={onSubmit}
      >
        <input
          type="hidden"
          name={config.sourceField}
          value={config.sourceValue}
        />
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
          <input
            id={emailId}
            name={config.emailField}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={!configured}
            className={`min-h-11 min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-400 ${twFocusRingPrimary}`}
          />
          <button
            type="submit"
            disabled={!configured}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-white disabled:shadow-none ${uiCtaPrimarySurface} ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
          >
            Subscribe
          </button>
        </div>

        <label
          htmlFor={consentId}
          className="flex items-start gap-2 text-xs leading-relaxed text-[#6b7280]"
        >
          <input
            id={consentId}
            name={config.consentField}
            type="checkbox"
            value="true"
            checked={consented}
            onChange={(event) => setConsented(event.currentTarget.checked)}
            required
            disabled={!configured}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:bg-gray-100"
          />
          <span>
            I agree to receive GoGoCash marketing emails and understand I can
            unsubscribe anytime.
          </span>
        </label>

        <p className="min-h-5 text-xs leading-relaxed" aria-live="polite">
          {state === "success" ? (
            <span className="font-medium text-primary">
              You&apos;re on the list. Check your inbox for updates.
            </span>
          ) : state === "error" ? (
            <span className="font-medium text-red-600">
              {configured
                ? "Enter a valid email and accept the email consent checkbox."
                : "Newsletter signup is being connected. Please check back soon."}
            </span>
          ) : !configured ? (
            <span className="text-[#9ca3af]">
              Newsletter signup is being connected.
            </span>
          ) : null}
        </p>
      </form>

      <iframe
        title="Newsletter signup response"
        name={frameName}
        className="hidden"
      />
    </section>
  );
}
