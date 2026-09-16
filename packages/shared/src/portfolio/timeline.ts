import { EPSILON, sortTransactions, type TransactionLike } from './holdings';

export interface TimelineViolation {
  transactionId: string;
  coinId: string;
  occurredAt: string;
  requested: number;
  available: number;
}

export type TransactionChange =
  | { kind: 'create'; transaction: TransactionLike }
  | { kind: 'update'; transaction: TransactionLike }
  | { kind: 'delete'; id: string };

/** First sell (in chronological order) that exceeds the quantity held at that moment, or `null`. */
export function findTimelineViolation(txs: readonly TransactionLike[]): TimelineViolation | null {
  const held = new Map<string, number>();

  for (const tx of sortTransactions(txs)) {
    const available = held.get(tx.coinId) ?? 0;
    if (tx.type === 'buy') {
      held.set(tx.coinId, available + tx.quantity);
      continue;
    }
    if (tx.quantity - available > EPSILON) {
      return {
        transactionId: tx.id,
        coinId: tx.coinId,
        occurredAt: tx.occurredAt,
        requested: tx.quantity,
        available,
      };
    }
    held.set(tx.coinId, available - tx.quantity);
  }

  return null;
}

/** Applies a create / update / delete to the list and returns a new array; the input is untouched. */
export function applyChange(
  txs: readonly TransactionLike[],
  change: TransactionChange,
): TransactionLike[] {
  switch (change.kind) {
    case 'create':
      return [...txs, change.transaction];
    case 'update':
      return txs.map((tx) => (tx.id === change.transaction.id ? change.transaction : tx));
    case 'delete':
      return txs.filter((tx) => tx.id !== change.id);
  }
}
