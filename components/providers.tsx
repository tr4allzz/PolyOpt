'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi'
import { ReactNode, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { WrappedProvider } from '@/components/wrapped/wrapped-provider'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    },
  }))

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WrappedProvider>
          {children}
        </WrappedProvider>
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
