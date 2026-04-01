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

    // Optional: persist selected query keys to localStorage for faster repeat visits.
    // Only enable after auditing keys for non-sensitive data; use `dehydrateOptions.shouldDehydrateQuery`.
    // if (typeof window !== 'undefined') {
    //   const persister = createSyncStoragePersister({ storage: window.localStorage })
    //   persistQueryClient({ queryClient: client, persister })
    // }
  }

  return client
}
