import { useCallback, useState } from 'react';
import type { CoinSearchResult } from '@crypto-tracker/shared';

const STORAGE_KEY = 'crypto-tracker.watchlist';
const MAX_ENTRIES = 20;

function isCoinSearchResult(value: unknown): value is CoinSearchResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.symbol === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.thumb === null || typeof candidate.thumb === 'string')
  );
}

function readWatchlist(): CoinSearchResult[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCoinSearchResult);
  } catch {
    return [];
  }
}

function writeWatchlist(coins: CoinSearchResult[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coins));
  } catch {
    // Ignore storage failures (private browsing, quota, disabled storage).
  }
}

export interface UseWatchlistResult {
  watchlist: CoinSearchResult[];
  addToWatchlist: (coin: CoinSearchResult) => void;
  removeFromWatchlist: (coinId: string) => void;
}

export function useWatchlist(): UseWatchlistResult {
  const [watchlist, setWatchlist] = useState<CoinSearchResult[]>(() => readWatchlist());

  const addToWatchlist = useCallback((coin: CoinSearchResult) => {
    setWatchlist((current) => {
      const withoutCoin = current.filter((entry) => entry.id !== coin.id);
      const next = [coin, ...withoutCoin].slice(0, MAX_ENTRIES);
      writeWatchlist(next);
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((coinId: string) => {
    setWatchlist((current) => {
      const next = current.filter((entry) => entry.id !== coinId);
      writeWatchlist(next);
      return next;
    });
  }, []);

  return { watchlist, addToWatchlist, removeFromWatchlist };
}
