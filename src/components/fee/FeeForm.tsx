"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { FeeSettingsForm } from "@/types/api";
import { useSession } from "next-auth/react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import apiClient from "@/lib/api";

export default function FeeForm() {
  const { data } = useSession();
  const session = data as { accessToken?: string };
  const { loading, error, getFee, setLoading } = useApi();

  const [forms, setForms] = useState<FeeSettingsForm>({
    system: 0,
    store: 0,
    minimum_withdraw: 0,
    id: "",
  });

  // Fetch offers
  const fetchFee = useCallback(async () => {
    try {
      getFee(session?.accessToken || "").then((response) => {
        const res = response?.[0];
        setForms({
          system: res.system,
          store: res.store,
          minimum_withdraw: res.minimum_withdraw,
          id: res._id,
        });
      });
    } catch (err) {
      console.error("Failed to fetch offers:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  // Initial load
  useEffect(() => {
    fetchFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.updateFee(
        forms,
        session?.accessToken || "",
      );
      if (response) {
        alert("Fee settings updated successfully");
      }

      // const response = await updateFee(forms, session?.accessToken || "");
      // Call your save API here
    } catch (error) {
      console.error("Failed to save fee settings:", error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <form onSubmit={handleSave}>
          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-6">
            <div>
              <Label>
                System <span className="text-error-500">*</span>{" "}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="0.00"
                  type="string"
                  value={forms.system}
                  min="0"
                  defaultValue={forms.system}
                  onChange={(e) =>
                    setForms({ ...forms, system: parseFloat(e.target.value) })
                  }
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
            <div>
              <Label>
                Store <span className="text-error-500">*</span>{" "}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="0.00"
                  type="string"
                  value={forms.store}
                  defaultValue={forms.store}
                  min="0"
                  onChange={(e) =>
                    setForms({ ...forms, store: parseFloat(e.target.value) })
                  }
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
            <div>
              <Label>
                Minimum Withdraw <span className="text-error-500">*</span>{" "}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="0.00"
                  type="string"
                  value={forms.minimum_withdraw}
                  defaultValue={forms.minimum_withdraw}
                  min="0"
                  onChange={(e) =>
                    setForms({
                      ...forms,
                      minimum_withdraw: parseFloat(e.target.value),
                    })
                  }
                />
                <span className="text-xs text-gray-500">USD</span>
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
