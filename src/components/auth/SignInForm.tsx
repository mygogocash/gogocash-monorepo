"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import Image from "next/image";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { DEFAULT_POST_LOGIN_PATH, safeAppPathFromCallback } from "@/lib/safeCallbackUrl";
import { devError } from "@/lib/devConsole";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  const redirectAfterSignIn = () => {
    const safe = safeAppPathFromCallback(searchParams.get("callbackUrl"));
    window.location.href = safe ?? DEFAULT_POST_LOGIN_PATH;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.ok) {
        redirectAfterSignIn();
        return;
      }
    } catch (err) {
      setError("An error occurred during sign in");
      devError("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: "admin@gogocash.co",
        password: "1234",
        redirect: false,
      });
      if (result?.error) {
        setError(
          "Mock sign-in is unavailable. Use email/password or enable ALLOW_MOCK_ADMIN_PASSWORD / run in development.",
        );
      } else if (result?.ok) {
        redirectAfterSignIn();
      }
    } catch (err) {
      setError("An error occurred during sign in");
      devError("Mock sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };
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
              className="h-12 w-auto sm:h-14"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </div>
          <div className="mb-5 sm:mb-8">
            <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in!
            </p>
          </div>

          {/* Quick access for internal use */}
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Quick access (internal use)
            </p>
            <button
              type="button"
              onClick={handleMockSignIn}
              disabled={isLoading}
              className="w-full rounded-lg border border-amber-400 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-600 dark:bg-amber-800/50 dark:text-amber-100 dark:hover:bg-amber-800/70"
            >
              Sign in with mock account
            </button>
            <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-500">
              admin@gogocash.co / 1234
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Or sign in with credentials
            </p>
          </div>

          <div className="text-left">
            <form onSubmit={handleSignIn}>
              {error && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="space-y-6">
                <div>
                  <Label>
                    Email / Username{" "}
                    <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    placeholder="admin@gogocash.co"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mock: 1234"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-4 z-30 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isChecked}
                      onChange={setIsChecked}
                      label=" Keep me logged in"
                    />
                    {/* <span className="text-theme-sm block font-normal text-gray-700 dark:text-gray-400">
                      Keep me logged in
                    </span> */}
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400 text-sm"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
