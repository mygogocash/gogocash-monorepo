export type WithdrawMethodKind = "promptpay" | "bank";

export type WithdrawSubmitRequest = {
  methodId: string;
  amount: number;
};

export type WithdrawSubmitResponse = {
  withdrawalId: string;
  status: string;
};

export type WithdrawMethodListResponse = {
  methods: Array<{ id: string; kind: WithdrawMethodKind; label: string }>;
};

export type WithdrawBaseClient = {
  get<TResponse = unknown>(path: string): Promise<TResponse>;
  post<TResponse = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<TResponse>;
};

// A withdrawal moves money, so every submit MUST carry a caller-generated
// Idempotency-Key. Reusing the same key when retrying the same logical submission
// (a double tap, a network retry) lets the backend settle it to one payout instead
// of paying out twice. The client refuses to submit without a key.
export function createWithdrawApi(client: WithdrawBaseClient) {
  return {
    listMethods() {
      return client.get<WithdrawMethodListResponse>("/withdraw/methods");
    },
    submitWithdrawal(request: WithdrawSubmitRequest, idempotencyKey: string) {
      if (!idempotencyKey) {
        throw new Error("submitWithdrawal requires an Idempotency-Key");
      }

      return client.post<WithdrawSubmitResponse>("/withdraw/submit", request, {
        "Idempotency-Key": idempotencyKey,
      });
    },
  };
}
