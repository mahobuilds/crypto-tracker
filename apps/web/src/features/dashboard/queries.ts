import { useQuery } from '@tanstack/react-query';
import { PRICE_REFRESH_INTERVAL_MS } from '@crypto-tracker/shared';
import type {
  HistoryRange,
  PortfolioHistoryResponse,
  PortfolioSummary,
  PortfolioView,
  WalletBreakdownResponse,
} from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';

export const portfolioQueryKey = ['portfolio'] as const;

const HISTORY_STALE_TIME_MS = 5 * 60 * 1000;

function withWallet(path: string, walletId: string | null): string {
  return walletId === null ? path : `${path}&walletId=${encodeURIComponent(walletId)}`;
}

/**
 * `whole` counts group trades in full; `mine` scales them to the owner's share.
 * `walletId` narrows the figures to one wallet; null is every wallet together.
 */
export function usePortfolio(view: PortfolioView = 'whole', walletId: string | null = null) {
  return useQuery({
    queryKey: [...portfolioQueryKey, 'summary', view, walletId],
    queryFn: () => apiFetch<PortfolioSummary>(withWallet(`/api/portfolio?view=${view}`, walletId)),
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
  });
}

export function usePortfolioHistory(range: HistoryRange, walletId: string | null = null) {
  return useQuery({
    queryKey: [...portfolioQueryKey, 'history', range, walletId],
    queryFn: () =>
      apiFetch<PortfolioHistoryResponse>(
        withWallet(`/api/portfolio/history?range=${range}`, walletId),
      ),
    staleTime: HISTORY_STALE_TIME_MS,
  });
}

/** Every wallet valued on its own, in one request. */
export function useWalletBreakdown(view: PortfolioView = 'whole') {
  return useQuery({
    queryKey: [...portfolioQueryKey, 'wallets', view],
    queryFn: () => apiFetch<WalletBreakdownResponse>(`/api/portfolio/wallets?view=${view}`),
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
  });
}
