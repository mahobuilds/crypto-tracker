import { EPSILON, sortTransactions, type TransactionLike } from './holdings';

/** One purchase lot still (partly) held: quantity remaining and its all-in cost per unit. */
interface Lot {
  quantity: number;
  costPerUnitUsd: number;
}

export interface FifoCoinResult {
  coinId: string;
  quantity: number;
  /** Cost basis of the remaining lots (oldest lots consumed first). */
  investedUsd: number;
  realizedPnlUsd: number;
}

export interface FifoResult {
  /** Keyed by coinId; only coins with a remaining quantity above EPSILON. */
  coins: Record<string, FifoCoinResult>;
  realizedPnlUsd: number;
}

/**
 * First-in, first-out cost basis. Each buy opens a lot (fee spread into its unit cost);
 * each sell consumes the oldest lots first and realizes the difference between the sale
 * price and those lots' cost, minus the sell fee. Compare with the average-cost engine in
 * `holdings.ts`: the same trades can show different realized and unrealized figures.
 */
export function computeFifo(txs: readonly TransactionLike[]): FifoResult {
  const lots = new Map<string, Lot[]>();
  const realized = new Map<string, number>();

  for (const tx of sortTransactions(txs)) {
    const queue = lots.get(tx.coinId) ?? [];
    lots.set(tx.coinId, queue);

    if (tx.type === 'buy') {
      if (tx.quantity <= 0) continue;
      queue.push({
        quantity: tx.quantity,
        costPerUnitUsd: tx.pricePerUnitUsd + tx.feeUsd / tx.quantity,
      });
      continue;
    }

    let remaining = tx.quantity;
    let pnl = 0;
    while (remaining > EPSILON && queue.length > 0) {
      const lot = queue[0]!;
      const consumed = Math.min(lot.quantity, remaining);
      pnl += (tx.pricePerUnitUsd - lot.costPerUnitUsd) * consumed;
      lot.quantity -= consumed;
      remaining -= consumed;
      if (lot.quantity <= EPSILON) queue.shift();
    }
    // Selling more than held is prevented by the timeline check; any excess is ignored here.
    pnl -= tx.feeUsd;
    realized.set(tx.coinId, (realized.get(tx.coinId) ?? 0) + pnl);
  }

  const coins: Record<string, FifoCoinResult> = {};
  let realizedPnlUsd = 0;
  const coinIds = new Set<string>([...lots.keys(), ...realized.keys()]);
  for (const coinId of coinIds) {
    const queue = lots.get(coinId) ?? [];
    const quantity = queue.reduce((sum, lot) => sum + lot.quantity, 0);
    const investedUsd = queue.reduce((sum, lot) => sum + lot.quantity * lot.costPerUnitUsd, 0);
    const coinRealized = realized.get(coinId) ?? 0;
    realizedPnlUsd += coinRealized;
    if (quantity > EPSILON) {
      coins[coinId] = { coinId, quantity, investedUsd, realizedPnlUsd: coinRealized };
    }
  }

  return { coins, realizedPnlUsd };
}
