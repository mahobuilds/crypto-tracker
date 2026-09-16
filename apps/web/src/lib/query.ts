import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 15_000,
      retry: 1,
    },
  },
});

export const queryKeys = {
  me: ['me'],
  prices: (ids: string[]) => ['prices', ids],
  fx: ['fx'],
  coinSearch: (q: string) => ['coins', 'search', q],
} as const;
