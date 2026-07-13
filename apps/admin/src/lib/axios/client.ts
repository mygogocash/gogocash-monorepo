import { handleMockApiRequest } from "@/lib/mockApiCore";
import { isStaticHostingClient } from "@/lib/isStaticHostingClient";
import { resolveAdminApiBaseURL } from "@/lib/backendProxy";
import { stripDefaultJsonContentTypeForFormData } from "@/lib/multipartFormHeaders";
import axios, {
  AxiosRequestConfig,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import xhrAdapter from "axios/lib/adapters/xhr.js";

// Real API in the browser goes through the same-origin BFF so the Nest JWT
// never reaches client JS. Mock mode is unchanged.
const isRealApi = !!process.env.NEXT_PUBLIC_API_URL;
const baseURL = resolveAdminApiBaseURL({
  realApiUrl: process.env.NEXT_PUBLIC_API_URL,
  isBrowser: true,
});

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
    // Auth is attached by `/api/backend` from the NextAuth JWT cookie.
    if (isRealApi && config.headers) {
      const headers = config.headers as {
        delete?: (name: string) => void;
        Authorization?: unknown;
        authorization?: unknown;
      };
      if (typeof headers.delete === "function") {
        headers.delete("Authorization");
        headers.delete("authorization");
      } else {
        delete headers.Authorization;
        delete headers.authorization;
      }
    }
    stripDefaultJsonContentTypeForFormData(
      config.headers as Record<string, unknown>,
      config.data,
    );
    return config;
  },
  (error) => Promise.reject(error),
);

/** NextAuth sign-in page (`pages.signIn` in the NextAuth route). */
export const SIGN_IN_PATH = "/signin";

/**
 * Real-API mode only: a 401 through the BFF means the NextAuth session (or its
 * embedded Nest JWT) is gone, so the browser should be sent back to sign-in.
 * Never redirect in mock mode (mock login legitimately 401s bad credentials),
 * outside the browser, or when already on the sign-in page (reload loop).
 */
export function shouldRedirectToSignInOn401(options: {
  status: number | undefined;
  realApi: boolean;
  isBrowser: boolean;
  pathname: string;
}): boolean {
  return (
    options.realApi &&
    options.isBrowser &&
    options.status === 401 &&
    !options.pathname.startsWith(SIGN_IN_PATH)
  );
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (
        typeof window !== "undefined" &&
        shouldRedirectToSignInOn401({
          status: error.response.status,
          realApi: isRealApi,
          isBrowser: true,
          pathname: window.location.pathname,
        })
      ) {
        window.location.assign(SIGN_IN_PATH);
      }
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
