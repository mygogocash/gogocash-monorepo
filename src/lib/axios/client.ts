import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { getSession, signOut } from "next-auth/react";
import { devEmailMockVerifyOtpHttpStatus } from "@/lib/dev/emailOtpMock";
import { getMockApiResponse, getMockHttpStatus } from "@/mocks/homeApi";
import { getApiBaseUrl, shouldUseMockApi } from "@/lib/env";
import { getPostHogRequestHeaders } from "@/lib/posthog";

const parseConfigData = (data: unknown): unknown => {
  if (data == null || data === "") return undefined;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  }
  return data;
};

const resolveRequestPath = (config: InternalAxiosRequestConfig): string => {
  const rel = config.url || "";
  if (rel.startsWith("http://") || rel.startsWith("https://")) {
    const u = new URL(rel);
    return `${u.pathname}${u.search}`;
  }
  const base = config.baseURL ? String(config.baseURL).replace(/\/$/, "") : "";
  if (rel.startsWith("/")) {
    return base ? `${base}${rel}` : rel;
  }
  if (!base) {
    return rel ? `/${rel}` : "/";
  }
  return `${base}/${rel}`;
};

const mockAwareAdapter = (config: InternalAxiosRequestConfig) => {
  if (shouldUseMockApi()) {
    const pathWithQuery = resolveRequestPath(config);
    const methodRaw = (config.method || "get").toUpperCase();
    const apiMethod = methodRaw === "PUT" ? "PUT" : methodRaw === "POST" ? "POST" : "GET";
    const body = parseConfigData(config.data);
    const mockData = getMockApiResponse(pathWithQuery, apiMethod, body);

    if (mockData !== null) {
      const pathname = new URL(pathWithQuery, "https://mock.gogocash.local").pathname;
      let status = getMockHttpStatus(pathname, apiMethod);
      const verifyOtpStatus =
        apiMethod === "POST" && pathname === "/auth/verify-otp"
          ? devEmailMockVerifyOtpHttpStatus(body)
          : undefined;
      if (verifyOtpStatus === 400) {
        status = 400;
      }
      const headers = new AxiosHeaders();
      headers.set("Content-Type", "application/json");

      const statusText = status === 201 ? "Created" : status >= 400 ? "Bad Request" : "OK";

      return Promise.resolve({
        data: mockData,
        status,
        statusText,
        headers,
        config,
        request: {},
      });
    }

    return Promise.reject(
      new AxiosError(
        `Mock API: no handler for ${apiMethod} ${pathWithQuery}`,
        "ERR_BAD_REQUEST",
        config
      )
    );
  }

  const run = axios.getAdapter(["xhr", "fetch"]);
  return run(config);
};

const baseURL = getApiBaseUrl();

const client = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  adapter: mockAwareAdapter,
});

client.interceptors.request.use(
  async (config) => {
    const session = await getSession(); // Get session
    // console.log('session', session);

    if (session?.user?.access_token) {
      config.headers.Authorization = `Bearer ${session.user.access_token}`;
    }

    if (typeof window !== "undefined") {
      const analyticsHeaders = getPostHogRequestHeaders();

      Object.entries(analyticsHeaders).forEach(([key, value]) => {
        config.headers[key] = value;
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const authMsg = error.response?.data?.message;
      const m = typeof authMsg === "string" ? authMsg : "";
      if (
        m.includes("Firebase ID token") ||
        m.includes("invalid algorithm") ||
        m.includes("jwt expired")
      ) {
        void signOut({ redirect: false });
        return Promise.reject(error.response);
      }
      return Promise.reject(error.response);
      // throw new Error('No response from server');
    } else if (error.request) {
      throw new Error("No response from server");
    } else {
      throw new Error("An error occurred while setting up the request");
    }
  }
);

export default client;

const extractRequestBody = (config?: AxiosRequestConfig) => config?.data;

const stripDataFromConfig = (config?: AxiosRequestConfig) => {
  if (!config) {
    return undefined;
  }

  const nextConfig = { ...config };
  delete nextConfig.data;

  return nextConfig;
};

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const mockResponse = getMockApiResponse(url, "GET");

  if (shouldUseMockApi() && mockResponse !== null) {
    return mockResponse;
  }

  try {
    const res = await client.get(url, { ...config });

    return res.data;
  } catch (error) {
    if (mockResponse !== null) {
      return mockResponse;
    }

    throw error;
  }
};

export const fetcherPost = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const requestBody = extractRequestBody(config);
  const mockResponse = getMockApiResponse(url, "POST", requestBody);

  if (shouldUseMockApi() && mockResponse !== null) {
    return mockResponse;
  }

  try {
    const res = await client.post(url, requestBody, stripDataFromConfig(config));

    return res.data;
  } catch (error) {
    if (mockResponse !== null) {
      return mockResponse;
    }

    throw error;
  }
};

export const fetcherPut = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const requestBody = extractRequestBody(config);
  const mockResponse = getMockApiResponse(url, "PUT", requestBody);

  if (shouldUseMockApi() && mockResponse !== null) {
    return mockResponse;
  }

  try {
    const res = await client.put(url, requestBody, stripDataFromConfig(config));

    return res.data;
  } catch (error) {
    if (mockResponse !== null) {
      return mockResponse;
    }

    throw error;
  }
};
