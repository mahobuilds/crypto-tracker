import { useCallback, useSyncExternalStore } from 'react';
import type { Wallet } from '@crypto-tracker/shared';
import { useWallets } from './queries';

/** `null` means every wallet together. */
export type WalletSelection = string | null;

const STORAGE_KEY = 'crypto-tracker.selectedWallet';

let current: WalletSelection = readStored();
const listeners = new Set<() => void>();

function readStored(): WalletSelection {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function write(value: WalletSelection) {
  current = value;
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage may be unavailable; the selection still holds for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface SelectedWallet {
  wallets: Wallet[];
  /** The chosen wallet id, or null for all wallets. Falls back to null if the id no longer exists. */
  walletId: WalletSelection;
  wallet: Wallet | null;
  setWalletId: (id: WalletSelection) => void;
  isPending: boolean;
  /** True once the user has more than one wallet, so a switcher is worth showing. */
  hasMultiple: boolean;
}

/**
 * The wallet the dashboard and holdings pages are looking at, shared across pages and
 * remembered between visits. A stale id (deleted wallet) reads back as "all wallets".
 */
export function useSelectedWallet(): SelectedWallet {
  const stored = useSyncExternalStore(subscribe, () => current);
  const query = useWallets();
  const wallets = query.data?.wallets ?? [];
  const wallet = stored === null ? null : (wallets.find((w) => w.id === stored) ?? null);
  const walletId = query.data && wallet === null ? null : stored;

  const setWalletId = useCallback((id: WalletSelection) => write(id), []);

  return {
    wallets,
    walletId,
    wallet,
    setWalletId,
    isPending: query.isPending,
    hasMultiple: wallets.length > 1,
  };
}
