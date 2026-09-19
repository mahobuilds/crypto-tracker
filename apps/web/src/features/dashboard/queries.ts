import { useQuery } from '@tanstack/react-query';
import { PRICE_REFRESH_INTERVAL_MS } from '@crypto-tracker/shared';
import type {
  HistoryRange,
  PortfolioHistoryResponse,
  PortfolioSummary,
  PortfolioView,
} from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';

export const portfolioQueryKey = ['portfolio'] as const;

const HISTORY_STALE_TIME_MS = 5 * 60 * 1000;

/** `whole` counts group trades in full; `mine` scales them to the owner's share. */
export function usePortfolio(view: PortfolioView = 'whole') {
  return useQuery({
    queryKey: [...portfolioQueryKey, 'summary', view],
    queryFn: () => apiFetch<PortfolioSummary>(`/api/portfolio?view=${view}`),
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
