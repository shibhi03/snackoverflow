"use client"

import React, { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 10, // 10 seconds
            refetchOnWindowFocus: true,
            retry: (failureCount, error: unknown) => {
              const status =
                typeof error === "object" && error !== null && "status" in error
                  ? (error as { status: number }).status
                  : undefined
              if (status === 401 || status === 403 || status === 404) {
                return false
              }
              return failureCount < 2
            },
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
