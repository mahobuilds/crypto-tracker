import { useQuery } from '@tanstack/react-query';
import { PRICE_REFRESH_INTERVAL_MS } from '@crypto-tracker/shared';
import type {
  HistoryRange,
  PortfolioHistoryResponse,
  PortfolioSummary,
} from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';

export const portfolioQueryKey = ['portfolio'] as const;

const HISTORY_STALE_TIME_MS = 5 * 60 * 1000;

export function usePortfolio() {
  return useQuery({
    queryKey: portfolioQueryKey,
    queryFn: () => apiFetch<PortfolioSummary>('/api/portfolio'),
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
  });
}

export function usePortfolioHistory(range: HistoryRange) {
  return useQuery({
    queryKey: [...portfolioQueryKey, 'history', range],
    queryFn: () => apiFetch<PortfolioHistoryResponse>(`/api/portfolio/history?range=${range}`),
    staleTime: HISTORY_STALE_TIME_MS,
  });
}
