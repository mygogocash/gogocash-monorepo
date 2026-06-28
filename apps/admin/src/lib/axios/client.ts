import type { DataSession } from "@/types/authSession";
import { handleMockApiRequest } from "@/lib/mockApiCore";
import { isStaticHostingClient } from "@/lib/isStaticHostingClient";
import { stripDefaultJsonContentTypeForFormData } from "@/lib/multipartFormHeaders";
import axios, {
  AxiosRequestConfig,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import xhrAdapter from "axios/lib/adapters/xhr.js";
import { getSession } from "next-auth/react";

// Use real API when NEXT_PUBLIC_API_URL is set; fall back to local mock.
const baseURL = process.env.NEXT_PUBLIC_API_URL || "/api/mock";
const isRealApi = !!process.env.NEXT_PUBLIC_API_URL;

const firebaseStaticMockAdapter: AxiosAdapter = async (
  config: InternalAxiosRequestConfig,
) => {
  const uri = axios.getUri(config);
  const u = new URL(uri, window.location.origin);
  const mockMarker = "/api/mock";
  const idx = u.pathname.indexOf(mockMarker);
  if (idx === -1) {
    return Promise.reject(new Error("Static mock: expected URL under /api/mock"));
  }
  const rest = u.pathname.slice(idx + mockMarker.length).replace(/^\/+/, "");
  const pathSegments = rest ? rest.split("/").filter(Boolean) : [];
  const method = (config.method || "get").toUpperCase();
  let body: unknown = config.data;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      /* non-JSON body */
    }
  }
  const result = await handleMockApiRequest({
    method,
    path: pathSegments,
    searchParams: u.searchParams,
    body,
  });
  return {
    data: result.body,
    status: result.status,
    statusText: result.status >= 400 ? "Error" : "OK",
    headers: {},
    config,
    request: {},
  };
};

const hybridAdapter: AxiosAdapter = (config) => {
  // Skip mock adapter when connected to real API
  if (isRealApi) {
    if (typeof xhrAdapter !== "function") {
      return Promise.reject(new Error("XHR adapter unavailable"));
    }
    return xhrAdapter(config);
  }
  if (typeof window !== "undefined" && isStaticHostingClient()) {
    return firebaseStaticMockAdapter(config);
  }
  if (typeof xhrAdapter !== "function") {
    return Promise.reject(new Error("XHR adapter unavailable"));
  }
  return xhrAdapter(config);
};

const client = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

if (typeof window !== "undefined") {
  client.defaults.adapter = hybridAdapter;
}

client.interceptors.request.use(
  async (config) => {
    const session = (await getSession()) as unknown as DataSession;
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    stripDefaultJsonContentTypeForFormData(
      config.headers as Record<string, unknown>,
      config.data,
    );
    return config;
  },
  (error) => Promise.reject(error),
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      return Promise.reject(error.response);
    }
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out. The server may still be processing the upload — try again or check API connectivity.",
      );
    }
    if (error.request) {
      throw new Error("No response from server");
    }
    throw new Error("An error occurred while setting up the request");
  },
);

export default client;

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await client.get(url, { ...config });

  return res.data;
};

export const fetcherPost = async (
  args: string | [string, AxiosRequestConfig],
) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await client.post(url, { ...config });

  return res.data;
};

export const fetcherPut = async (
  args: string | [string, AxiosRequestConfig],
) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await client.put(url, { ...config });

  return res.data;
};
