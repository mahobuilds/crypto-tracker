import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PRICE_REFRESH_INTERVAL_MS } from '@crypto-tracker/shared';
import type { PriceQuote, PricesResponse } from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query';

const EMPTY_PRICES: Record<string, PriceQuote> = {};

export interface UsePricesResult {
  prices: Record<string, PriceQuote>;
  updatedAt: string | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function usePrices(coinIds: string[]): UsePricesResult {
  const ids = useMemo(() => Array.from(new Set(coinIds)).sort(), [coinIds]);

  const query = useQuery({
    queryKey: queryKeys.prices(ids),
    queryFn: () => apiFetch<PricesResponse>(`/api/prices?ids=${encodeURIComponent(ids.join(','))}`),
    enabled: ids.length > 0,
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
  });

  return {
    prices: query.data?.prices ?? EMPTY_PRICES,
    updatedAt: query.data?.updatedAt ?? null,
    isLoading: ids.length > 0 && query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
