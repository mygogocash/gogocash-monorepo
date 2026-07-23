import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { hasUsableMobileSessionToken } from "@mobile/auth/sessionValidity";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { getMobileEnv } from "@mobile/config/env";
import { createWithdrawApi } from "@mobile/withdraw/api";
import {
  buildFixturePayoutMethods,
  mapWithdrawMethodRecordToPayoutMethod,
  mergePayoutMethodSave,
  parseAccountNumberForApi,
  resolveBankCode,
  type PayoutMethod,
  type PayoutMethodDraft,
} from "@mobile/withdraw/payoutMethodModel";
import {
  resolvePayoutMethodsQueryKey,
  resolvePayoutMethodsSessionScope,
} from "@mobile/withdraw/payoutMethodsQueryKey";

export type PayoutMethodsStatus = "disabled" | "empty" | "error" | "loading" | "ready";

export type UsePayoutMethodsResult = {
  findMethodById: (id: string) => PayoutMethod | undefined;
  methods: readonly PayoutMethod[];
  saveMethod: (draft: PayoutMethodDraft, existingId?: string) => Promise<PayoutMethod>;
  status: PayoutMethodsStatus;
};

async function fetchPayoutMethods(apiUrl: string): Promise<PayoutMethod[]> {
  const client = await getSharedMobileApiClient(apiUrl);
  if (!client) {
    throw new Error("No mobile session store is available.");
  }
  const withdrawApi = createWithdrawApi(client);
  const records = await withdrawApi.listMethods();
  return records.map(mapWithdrawMethodRecordToPayoutMethod);
}

export function usePayoutMethods(): UsePayoutMethodsResult {
  const env = useMemo(() => getMobileEnv(), []);
  const session = useMobileSessionSnapshot();
  const queryClient = useQueryClient();
  const sessionScope = resolvePayoutMethodsSessionScope(session);
  const queryKey = resolvePayoutMethodsQueryKey(env.apiUrl ?? "", sessionScope);
  const isAuthed = hasUsableMobileSessionToken(session, env.accountDataSource);
  const useBackend =
    env.accountDataSource === "backend" && Boolean(env.apiUrl) && isAuthed;

  const useFixtures =
    env.accountDataSource === "fixtures" || env.accountDataSource === "disabled";

  const query = useQuery({
    queryKey,
    enabled: useBackend,
    queryFn: () => fetchPayoutMethods(env.apiUrl!),
    initialData: useFixtures ? buildFixturePayoutMethods() : undefined,
    staleTime: 60_000,
  });

  const methods = useFixtures
    ? (query.data ?? buildFixturePayoutMethods())
    : (query.data ?? []);

  const mutation = useMutation({
    mutationFn: async ({
      draft,
      existingId,
    }: {
      draft: PayoutMethodDraft;
      existingId?: string;
    }) => {
      const current =
        queryClient.getQueryData<PayoutMethod[]>(queryKey) ??
        (useBackend ? [] : buildFixturePayoutMethods());

      if (!useBackend) {
        const { methods: nextMethods, saved } = mergePayoutMethodSave(current, draft, existingId);
        queryClient.setQueryData(queryKey, nextMethods);
        return saved;
      }

      const client = await getSharedMobileApiClient(env.apiUrl!);
      if (!client) {
        throw new Error("No mobile session store is available.");
      }
      const withdrawApi = createWithdrawApi(client);
      const payload = {
        account_name: draft.accountName.trim(),
        account_no: parseAccountNumberForApi(draft.accountNo),
        bank_name: draft.bankName.trim(),
        bank_code: resolveBankCode(draft.bankName),
        is_default: draft.isDefault,
      };

      const response = existingId
        ? await withdrawApi.updateMethod(existingId, payload)
        : await withdrawApi.createMethod(payload);

      const saved = mapWithdrawMethodRecordToPayoutMethod(response.data);
      const { methods: nextMethods } = mergePayoutMethodSave(current, saved, existingId);
      queryClient.setQueryData(queryKey, nextMethods);
      return saved;
    },
  });

  const saveMethod = useCallback(
    async (draft: PayoutMethodDraft, existingId?: string) => {
      return mutation.mutateAsync({ draft, existingId });
    },
    [mutation],
  );

  const findMethodById = useCallback(
    (id: string) => methods.find((method) => method.id === id),
    [methods],
  );

  const status: PayoutMethodsStatus = useMemo(() => {
    if (env.accountDataSource === "disabled") {
      return "disabled";
    }
    if (useBackend && query.isLoading) {
      return "loading";
    }
    if (useBackend && query.isError) {
      return "error";
    }
    if (methods.length === 0) {
      return "empty";
    }
    return "ready";
  }, [env.accountDataSource, methods.length, query.isError, query.isLoading, useBackend]);

  return {
    findMethodById,
    methods,
    saveMethod,
    status,
  };
}

export {
  buildFixturePayoutMethods,
  mapWithdrawMethodRecordToPayoutMethod,
  maskAccountNumber,
  mergePayoutMethodSave,
  type PayoutMethod,
  type PayoutMethodDraft,
} from "@mobile/withdraw/payoutMethodModel";
