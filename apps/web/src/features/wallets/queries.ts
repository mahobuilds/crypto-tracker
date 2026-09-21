import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Wallet, WalletInput, WalletListResponse } from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';

export const walletsQueryKey = ['wallets'] as const;

const WALLETS_STALE_TIME_MS = 5 * 60 * 1000;

export function useWallets() {
  return useQuery({
    queryKey: walletsQueryKey,
    queryFn: () => apiFetch<WalletListResponse>('/api/wallets'),
    staleTime: WALLETS_STALE_TIME_MS,
  });
}

/** Wallet changes touch the portfolio breakdown and the transaction list too. */
function invalidateAfterMutation(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: walletsQueryKey });
  void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
  void queryClient.invalidateQueries({ queryKey: ['transactions'] });
}

export function useCreateWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WalletInput) =>
      apiFetch<Wallet>('/api/wallets', { method: 'POST', json: input }),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

export interface UpdateWalletVars {
  id: string;
  input: WalletInput;
}

export function useUpdateWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateWalletVars) =>
      apiFetch<Wallet>(`/api/wallets/${id}`, { method: 'PUT', json: input }),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

export function useDeleteWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/wallets/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}
