"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Link from "next/link";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { devError } from "@/lib/devConsole";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { AuthShell } from "@/components/auth/ForgotPasswordForm";
import { PasswordField } from "@/components/auth/ResetPasswordForm";

const MIN_PASSWORD = 8;

export default function AcceptInviteForm() {
  const params = useSearchParams();
  const token = (params.get("token") ?? "").trim();
  const email = (params.get("email") ?? "").trim();

  const [username, setUsername] = useState("");
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
      await apiClient.acceptInvite({ email, token, password, username: username.trim() || undefined });
      setDone(true);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "This invitation is invalid or has expired. Ask an admin to re-send it.",
        ),
      );
      devError("accept-invite error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (invalidLink) {
    return (
      <AuthShell title="Accept invitation" subtitle="This invite link is missing its token.">
        <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-left text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          Invalid invitation link. Ask an admin to re-send your invite.
        </div>
        <Link href="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400 text-sm">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Account created" subtitle="You can now sign in to GoGoCash Admin.">
        <Link href="/signin" className="inline-block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700">
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Accept invitation" subtitle={`Set up your admin account for ${email}.`}>
      <form onSubmit={handleSubmit} className="text-left">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="space-y-6">
          <div>
            <Label>Display name</Label>
            <Input
              placeholder={email.split("@")[0]}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <PasswordField label="Password" value={password} onChange={setPassword} show={show} setShow={setShow} />
          <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} show={show} setShow={setShow} />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
