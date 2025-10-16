"use client";

import { useState } from "react";
import { useAuth, useApi } from "@/hooks/useApi";
import { LoginResponse } from "@/types/api";

// Example component showing how to use the API integration
export default function ApiExample() {
  const { session, loading: authLoading, error: authError } = useAuth();
  const {
    loading: apiLoading,
    error: apiError,
    get,
    post,
    getProfile,
  } = useApi();
  const [data, setData] = useState<LoginResponse | null>(null);

  const handleGetProfile = async () => {
    try {
      const profile = await getProfile();
      setData(profile);
    } catch (error) {
      console.error("Failed to get profile:", error);
    }
  };

  const handleGetData = async () => {
    try {
      const result = await get("/some-endpoint");
      setData(result as LoginResponse);
    } catch (error) {
      console.error("Failed to get data:", error);
    }
  };

  const handlePostData = async () => {
    try {
      const result = await post("/some-endpoint", {
        name: "Test",
        value: 123,
      });
      setData(result as LoginResponse);
    } catch (error) {
      console.error("Failed to post data:", error);
    }
  };

  if (!session) {
    return <div>Please sign in to use API features</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold">API Integration Example</h2>

      {(authError || apiError) && (
        <div className="rounded border border-red-300 bg-red-100 p-3 text-red-700">
          Error: {authError || apiError}
        </div>
      )}

      <div className="space-x-4">
        <button
          onClick={handleGetProfile}
          disabled={authLoading || apiLoading}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {apiLoading ? "Loading..." : "Get Profile"}
        </button>

        <button
          onClick={handleGetData}
          disabled={authLoading || apiLoading}
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
        >
          {apiLoading ? "Loading..." : "GET Request"}
        </button>

        <button
          onClick={handlePostData}
          disabled={authLoading || apiLoading}
          className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {apiLoading ? "Loading..." : "POST Request"}
        </button>
      </div>

      {data && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">API Response:</h3>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
