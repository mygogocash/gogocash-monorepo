'use client'

import { QueryClient } from '@tanstack/react-query'
// import { persistQueryClient } from '@tanstack/react-query-persist-client'
// import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

let client: QueryClient | null = null

export function getQueryClient() {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
          // List/read queries: avoid refetch churn; override per-query for live data.
          staleTime: 1000 * 60 * 2,
          gcTime: 1000 * 60 * 30,
        },
      },
    })

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

  return client
}
