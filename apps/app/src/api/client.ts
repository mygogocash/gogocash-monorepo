import type { MobileSessionStore } from "@mobile/auth/session";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type MobileApiClientOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  getPreferredAuthToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
  sessionStore: MobileSessionStore;
};

export function createMobileApiClient(options: MobileApiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  async function request<TResponse>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    customHeaders: Record<string, string> = {}
  ): Promise<TResponse> {
    const session = await options.sessionStore.getSession();
    const preferredToken = options.getPreferredAuthToken
      ? await options.getPreferredAuthToken()
      : null;
    const token =
      (typeof preferredToken === "string" && preferredToken.length > 0
        ? preferredToken
        : typeof session?.access_token === "string"
          ? session.access_token
          : "") ?? "";
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...customHeaders,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const init: RequestInit = {
      headers,
      method,
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    try {
      const response = await fetchImpl(buildUrl(baseUrl, path), init);
      const responseBody = await parseResponseBody(response);

      if (!response.ok) {
        const errorMessage =
          responseBody && typeof responseBody === "object" && "message" in responseBody
            ? String(responseBody.message)
            : `Request failed with status ${response.status}`;

        // Only an authenticated request 401-ing means the stored session is
        // bad; a public endpoint's 401 must never force-logout the user.
        if (response.status === 401 && token) {
          await options.sessionStore.clearSession();
          options.onUnauthorized?.();
        }

        throw new ApiError(errorMessage, response.status);
      }

      return responseBody as TResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError("Network request failed", 0, "NETWORK_ERROR");
    }
  }

  return {
    get<TResponse = unknown>(path: string) {
      return request<TResponse>("GET", path);
    },
    post<TResponse = unknown>(path: string, body?: unknown, headers?: Record<string, string>) {
      return request<TResponse>("POST", path, body, headers);
    },
    postFormData<TResponse = unknown>(path: string, formData: FormData) {
      return requestFormData<TResponse>(path, formData, options);
    },
  };
}

async function requestFormData<TResponse>(
  path: string,
  formData: FormData,
  options: MobileApiClientOptions,
): Promise<TResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const session = await options.sessionStore.getSession();
  const preferredToken = options.getPreferredAuthToken
    ? await options.getPreferredAuthToken()
    : null;
  const token =
    (typeof preferredToken === "string" && preferredToken.length > 0
      ? preferredToken
      : typeof session?.access_token === "string"
        ? session.access_token
        : "") ?? "";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetchImpl(buildUrl(baseUrl, path), {
      body: formData,
      headers,
      method: "POST",
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage =
        responseBody && typeof responseBody === "object" && "message" in responseBody
          ? String(responseBody.message)
          : `Request failed with status ${response.status}`;

      if (response.status === 401 && token) {
        await options.sessionStore.clearSession();
        options.onUnauthorized?.();
      }

      throw new ApiError(errorMessage, response.status);
    }

    return responseBody as TResponse;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError("Network request failed", 0, "NETWORK_ERROR");
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
