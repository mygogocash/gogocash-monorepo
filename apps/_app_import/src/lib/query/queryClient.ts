"use client";

import { QueryClient } from "@tanstack/react-query";
// import { persistQueryClient } from '@tanstack/react-query-persist-client'
// import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

let client: QueryClient | null = null;

export function getQueryClient() {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
          /** Default 1m fresh window — override per-query (e.g. `staleTime: Infinity`) where needed. */
          staleTime: 60_000,
          gcTime: 1000 * 60 * 5,
        },
      },
    });

    // if (typeof window !== 'undefined') {
    //   const persister = createSyncStoragePersister({
    //     storage: window.localStorage,
    //   })

    //   persistQueryClient({
    //     queryClient: client,
    //     persister,
    //   })
    // }
  }

  return client;
}
