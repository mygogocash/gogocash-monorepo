"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Link from "next/link";
import Image from "next/image";
import React, { useState } from "react";
import { apiClient } from "@/lib/api";
import { devError } from "@/lib/devConsole";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await apiClient.requestPasswordReset(email.trim());
      setMessage(res.message ?? "If that email is registered, a reset link has been sent.");
      setSent(true);
    } catch (err) {
      // The backend returns a generic message; only show an error on transport failure.
      setError("Could not send the reset email. Please try again.");
      devError("forgot-password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we'll send you a reset link.">
      {sent ? (
        <div className="text-left">
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400">
            {message}
          </div>
          <Link href="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400 text-sm">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="text-left">
          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-6">
            <div>
              <Label>
                Email <span className="text-error-500">*</span>
              </Label>
              <Input
                placeholder="you@gogocash.co"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </button>
            <Link href="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400 block text-center text-sm">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

/** Shared centered auth card (logo + heading), reused by the auth forms. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center pt-6 sm:pt-8">
        <div className="w-full text-center">
          <div className="mb-6 flex justify-center sm:mb-8">
            <Image
              src="/images/logo/gogocash-logo.png"
              alt="GoGoCash"
              width={180}
              height={56}
              className="h-12 w-auto rounded-[22%] [corner-shape:squircle] sm:h-14"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </div>
          <div className="mb-6 sm:mb-8">
            <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
