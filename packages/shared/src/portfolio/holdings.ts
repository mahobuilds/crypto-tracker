import type { Transaction } from '../types';

export type TransactionLike = Pick<
  Transaction,
  | 'id'
  | 'type'
  | 'coinId'
  | 'coinSymbol'
  | 'coinName'
  | 'quantity'
  | 'pricePerUnitUsd'
  | 'feeUsd'
  | 'occurredAt'
  | 'createdAt'
> & {
  /** Owner's share of the trade in percent (1-100). Missing means 100 (a personal trade). */
  ownerSharePct?: number;
};

/**
 * Scales every trade down to the owner's share: quantity and fee shrink by `ownerSharePct`,
 * the unit price stays. Personal trades (100%) come back unchanged. Pure.
 */
export function toOwnerShare<T extends TransactionLike>(txs: readonly T[]): T[] {
  return txs.map((tx) => {
    const pct = tx.ownerSharePct ?? 100;
    if (pct >= 100) return tx;
    const factor = pct / 100;
    return { ...tx, quantity: tx.quantity * factor, feeUsd: tx.feeUsd * factor };
  });
}

export interface HoldingCore {
  coinId: string;
  coinSymbol: string;
  coinName: string;
  quantity: number;
  averageCostUsd: number;
  investedUsd: number;
  /** Realized P/L from this coin's sells so far (average-cost method). */
  realizedPnlUsd: number;
}

export interface HoldingsResult {
  holdings: HoldingCore[];
  realizedPnlUsd: number;
}

/** Quantities at or below this are treated as zero (floating point dust). */
export const EPSILON = 1e-9;

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** New array ordered by `occurredAt`, then `createdAt`, then `id`, all ascending. */
export function sortTransactions<T extends TransactionLike>(txs: readonly T[]): T[] {
  return [...txs].sort(
    (a, b) =>
      compareStrings(a.occurredAt, b.occurredAt) ||
      compareStrings(a.createdAt, b.createdAt) ||
      compareStrings(a.id, b.id),
  );
}

interface CoinState {
  coinId: string;
  coinSymbol: string;
  coinName: string;
  quantity: number;
  totalCostUsd: number;
  realizedPnlUsd: number;
}

/**
 * Replays the transactions in chronological order using the average-cost method.
 * An oversell never throws here; the sold quantity is clamped to what is held.
 */
export function computeHoldings(txs: readonly TransactionLike[]): HoldingsResult {
  const states = new Map<string, CoinState>();
  let realizedPnlUsd = 0;

  for (const tx of sortTransactions(txs)) {
    let state = states.get(tx.coinId);
    if (!state) {
      state = {
        coinId: tx.coinId,
        coinSymbol: tx.coinSymbol,
        coinName: tx.coinName,
        quantity: 0,
        totalCostUsd: 0,
        realizedPnlUsd: 0,
      };
      states.set(tx.coinId, state);
    }
    state.coinSymbol = tx.coinSymbol;
    state.coinName = tx.coinName;

    if (tx.type === 'buy') {
      state.totalCostUsd += tx.quantity * tx.pricePerUnitUsd + tx.feeUsd;
      state.quantity += tx.quantity;
      continue;
    }

    const soldQuantity = Math.min(tx.quantity, state.quantity);
    const averageCost = state.quantity > 0 ? state.totalCostUsd / state.quantity : 0;
    const pnl = (tx.pricePerUnitUsd - averageCost) * soldQuantity - tx.feeUsd;
    realizedPnlUsd += pnl;
    state.realizedPnlUsd += pnl;
    state.totalCostUsd -= averageCost * soldQuantity;
    state.quantity -= soldQuantity;
    if (state.quantity < EPSILON) {
      state.quantity = 0;
      state.totalCostUsd = 0;
    }
  }

  const holdings: HoldingCore[] = [];
  for (const state of states.values()) {
    if (state.quantity <= EPSILON) continue;
    holdings.push({
      coinId: state.coinId,
      coinSymbol: state.coinSymbol,
      coinName: state.coinName,
      quantity: state.quantity,
      averageCostUsd: state.totalCostUsd / state.quantity,
      investedUsd: state.totalCostUsd,
      realizedPnlUsd: state.realizedPnlUsd,
    });
  }
  holdings.sort((a, b) => b.investedUsd - a.investedUsd);

  return { holdings, realizedPnlUsd };
}
