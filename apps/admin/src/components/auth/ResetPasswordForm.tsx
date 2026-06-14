"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { devError } from "@/lib/devConsole";
import { AuthShell } from "@/components/auth/ForgotPasswordForm";

const MIN_PASSWORD = 8;

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const invalidLink = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.resetPassword({ email, token, password });
      setDone(true);
    } catch (err) {
      setError("This reset link is invalid or has expired. Request a new one.");
      devError("reset-password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (invalidLink) {
    return (
      <AuthShell title="Reset password" subtitle="This link is missing its token.">
        <div className="text-left">
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            Invalid reset link. Please request a new one.
          </div>
          <Link href="/forgot-password" className="text-brand-500 hover:text-brand-600 dark:text-brand-400 text-sm">
            Request a new reset link
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <Link href="/signin" className="inline-block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700">
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" subtitle={`Set a new password for ${email}.`}>
      <form onSubmit={handleSubmit} className="text-left">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="space-y-6">
          <PasswordField label="New password" value={password} onChange={setPassword} show={show} setShow={setShow} />
          <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} show={show} setShow={setShow} />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
}) {
  return (
    <div>
      <Label>
        {label} <span className="text-error-500">*</span>
      </Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span
          onClick={() => setShow(!show)}
          className="absolute top-1/2 right-4 z-30 -translate-y-1/2 cursor-pointer"
        >
          {show ? (
            <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
          ) : (
            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
          )}
        </span>
      </div>
    </div>
  );
}
