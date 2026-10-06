import { z } from 'zod';
import { TRANSACTION_SCOPES, WALLET_NAME_MAX } from './constants';
import { addSplitIssues, participantSchema, trimmedString } from './transactions';
import type { Wallet, WalletInput } from './types';

/**
 * A wallet is solo (`personal`) or shared by a group. Every trade in a group wallet is split
 * by the wallet's participants, so the shares are entered once here instead of on each trade.
 */
export const walletInputSchema = z
  .object({
    name: trimmedString(WALLET_NAME_MAX),
    scope: z.enum(TRANSACTION_SCOPES).default('personal'),
    participants: z.array(participantSchema).max(50).default([]),
  })
  .superRefine(addSplitIssues);

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
