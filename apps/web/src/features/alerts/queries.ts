import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PRICE_REFRESH_INTERVAL_MS } from '@crypto-tracker/shared';
import type { Alert, AlertInput, AlertListResponse } from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';

export const alertsQueryKey = ['alerts'] as const;

function fetchAlerts(): Promise<AlertListResponse> {
  return apiFetch<AlertListResponse>('/api/alerts');
}

export function useAlerts() {
  return useQuery({
    queryKey: alertsQueryKey,
    queryFn: fetchAlerts,
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AlertInput) =>
      apiFetch<Alert>('/api/alerts', { method: 'POST', json: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertsQueryKey });
    },
  });
}

export interface UpdateAlertVars {
  id: string;
  input: AlertInput;
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateAlertVars) =>
      apiFetch<Alert>(`/api/alerts/${id}`, { method: 'PUT', json: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertsQueryKey });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/alerts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertsQueryKey });
    },
  });
}
