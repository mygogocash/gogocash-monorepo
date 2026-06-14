export type PdpaDataExportRequest = {
  // Locale only — the subject is the authenticated caller. There is deliberately
  // no caller-supplied subject-identifier field on this request: a caller must
  // never be able to request another person's data export by passing an id. The
  // backend resolves the subject from the bearer token on the session-bound
  // endpoint below.
  locale?: "en" | "th";
};

export type PdpaDataExportResponse = {
  requestId: string;
  status: "pending" | "ready" | "failed";
  downloadUrl?: string;
};

export type PdpaBaseClient = {
  get<TResponse = unknown>(path: string): Promise<TResponse>;
  post<TResponse = unknown>(path: string, body?: unknown): Promise<TResponse>;
};

export function createPdpaApi(client: PdpaBaseClient) {
  return {
    requestDataExport(request: PdpaDataExportRequest = {}) {
      return client.post<PdpaDataExportResponse>("/pdpa/data-export", request);
    },
    getDataExportStatus() {
      return client.get<PdpaDataExportResponse>("/pdpa/data-export/status");
    },
  };
}
