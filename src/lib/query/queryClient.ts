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
          staleTime: 0, // cache ไม่มีวันหมดอายุ
          // gcTime: 1000 * 60 * 60 * 24, // เก็บไว้ 24 ชม.
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
