import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Transaction,
  TransactionInput,
  TransactionListResponse,
  TransactionType,
} from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';

export const transactionsQueryKey = ['transactions'] as const;

export interface TransactionsFilter {
  coinId?: string;
  type?: TransactionType;
  walletId?: string;
}

function buildTransactionsPath(filter: TransactionsFilter): string {
  const params = new URLSearchParams();
  if (filter.coinId) params.set('coinId', filter.coinId);
  if (filter.type) params.set('type', filter.type);
  if (filter.walletId) params.set('walletId', filter.walletId);
  const query = params.toString();
  return query ? `/api/transactions?${query}` : '/api/transactions';
}

export function useTransactions(filter: TransactionsFilter) {
  return useQuery({
    queryKey: [...transactionsQueryKey, filter],
    queryFn: () => apiFetch<TransactionListResponse>(buildTransactionsPath(filter)),
  });
}

function invalidateAfterMutation(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
  void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
  // Wallet rows carry a transaction count.
  void queryClient.invalidateQueries({ queryKey: ['wallets'] });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      apiFetch<Transaction>('/api/transactions', { method: 'POST', json: input }),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      apiFetch<Transaction>(`/api/transactions/${id}`, { method: 'PUT', json: input }),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}
