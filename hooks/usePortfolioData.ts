// hooks/usePortfolioData.ts
// React Query hook for fetching portfolio data with caching

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from 'wagmi';

export function usePortfolioData() {
  const { authenticatedFetch, isAuthenticating, address, walletClientReady } = useAuth();
  const { isConnected } = useAccount();

  return useQuery({
    queryKey: ['portfolio-data', address],
    queryFn: async () => {
      console.log('🔄 Fetching portfolio data...');

      try {
        const response = await authenticatedFetch('/api/user/portfolio-data');

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.message || errorData.error || 'Failed to fetch portfolio data');
        }

        const data = await response.json();
        console.log('✅ Portfolio data loaded:', data);
        return data;
      } catch (error) {
        console.error('❌ Error in queryFn:', error);
        throw error;
      }
    },
    enabled: isConnected && !isAuthenticating && !!address && walletClientReady,
    staleTime: 60 * 1000, // Fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry failed auth requests
  });
}
