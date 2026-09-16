import { useQuery } from '@tanstack/react-query';
import type { FxRates } from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

/** Identity rates used only while the first fetch is in flight. */
const LOADING_FX: FxRates = {
  base: 'USD',
  rates: { USD: 1, EUR: 1, SAR: 1, TRY: 1 },
  updatedAt: '',
};

export interface UseFxResult {
  /** Live rates; identity rates while loading; `null` after an error with no cached data. */
  fx: FxRates | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useFx(): UseFxResult {
  const query = useQuery({
    queryKey: queryKeys.fx,
    queryFn: () => apiFetch<FxRates>('/api/fx'),
    refetchInterval: SIX_HOURS_MS,
    staleTime: ONE_HOUR_MS,
  });

  let fx: FxRates | null = query.data ?? null;
  if (!fx && query.isPending) {
    fx = LOADING_FX;
  }

  return {
    fx,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
