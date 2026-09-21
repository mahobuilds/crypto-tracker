import { z } from 'zod';
import { WALLET_NAME_MAX } from './constants';
import { trimmedString } from './transactions';
import type { Wallet, WalletInput } from './types';

export const walletInputSchema = z.object({
  name: trimmedString(WALLET_NAME_MAX),
});

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const walletSchemaMatchesType: AssertEqual<z.infer<typeof walletInputSchema>, WalletInput> = true;
void walletSchemaMatchesType;

/** Case- and whitespace-insensitive key used to reject duplicate wallet names. */
export function walletNameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/** Wallets ordered by creation time, oldest first, so the default wallet stays on top. */
export function sortWallets<T extends Pick<Wallet, 'createdAt' | 'name'>>(
  wallets: readonly T[],
): T[] {
  return [...wallets].sort(
    (a, b) =>
      (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) ||
      a.name.localeCompare(b.name),
  );
}
