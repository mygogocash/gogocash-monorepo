import { DataSession } from "@/app/api/auth/[...nextauth]/route";
import { handleMockApiRequest } from "@/lib/mockApiCore";
import { isStaticHostingClient } from "@/lib/isStaticHostingClient";
import axios, {
  AxiosRequestConfig,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import { getSession } from "next-auth/react";

// Internal-only: always use mock API.
const baseURL = "/api/mock";

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
  if (typeof window !== "undefined" && isStaticHostingClient()) {
    return firebaseStaticMockAdapter(config);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- axios does not export the XHR adapter publicly
  const xhr = require("axios/lib/adapters/xhr.js").default as AxiosAdapter;
  if (typeof xhr !== "function") {
    return Promise.reject(new Error("XHR adapter unavailable"));
  }
  return xhr(config);
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
    const session = (await getSession()) as unknown as DataSession; // Get session
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // console.log('API response error:', error.response);
      //   throw new Error(error.response.data.message || 'API request failed');
      return Promise.reject(error.response);
      // throw new Error('No response from server');
    } else if (error.request) {
      throw new Error("No response from server");
    } else {
      throw new Error("An error occurred while setting up the request");
    }
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
