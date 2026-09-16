import { asc, eq, gte, and } from 'drizzle-orm';
import {
  TRANSACTION_TYPES,
  computePortfolio,
  type FxRates,
  type PortfolioSnapshot,
  type PortfolioSummary,
  type PriceQuote,
  type TransactionLike,
} from '@crypto-tracker/shared';
import type { Database } from '../db/client';
import type { Env } from '../env';
import { portfolioSnapshots, transactions, type TransactionRow } from '../db/schema';
import { newId } from '../lib/ids';
import type { PortfolioDeps } from '../routes/portfolio';

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

/** Projects a DB row down to the fields the portfolio math needs. */
export function rowToTransactionLike(row: TransactionRow): TransactionLike {
  if (!isOneOf(TRANSACTION_TYPES, row.type)) {
    throw new Error(`Unknown transaction type "${row.type}" for transaction ${row.id}`);
  }
  return {
    id: row.id,
    type: row.type,
    coinId: row.coinId,
    coinSymbol: row.coinSymbol,
    coinName: row.coinName,
    quantity: row.quantity,
    pricePerUnitUsd: row.pricePerUnitUsd,
    feeUsd: row.feeUsd,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  };
}

/** Pure delegation seam: turns fetched transactions/prices/fx into a `PortfolioSummary`. */
export function summarize(
  txs: readonly TransactionLike[],
  prices: Readonly<Record<string, PriceQuote | undefined>>,
  fx: FxRates,
  pricesUpdatedAt: string | null,
): PortfolioSummary {
  return computePortfolio({ transactions: txs, prices, fx, pricesUpdatedAt });
}

/** Builds the `GET /api/portfolio` summary for a user from their stored transactions. */
export async function buildPortfolio(
  env: Env,
  db: Database,
  userId: string,
  deps: PortfolioDeps,
): Promise<PortfolioSummary> {
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
  });
  const txs = rows.map(rowToTransactionLike);

  if (txs.length === 0) {
    const fx = await deps.fx.getFxRates(env);
    return summarize([], {}, fx, null);
  }

  const coinIds = [...new Set(txs.map((tx) => tx.coinId))];
  const [{ prices, updatedAt }, fx] = await Promise.all([
    deps.prices.getPrices(env, coinIds),
    deps.fx.getFxRates(env),
  ]);
  return summarize(txs, prices, fx, updatedAt);
}

/** Reduces `points` to at most `maxPoints`, always keeping the first and the last. Pure. */
export function downsample(
  points: readonly PortfolioSnapshot[],
  maxPoints: number,
): PortfolioSnapshot[] {
  if (points.length <= maxPoints) return [...points];
  if (maxPoints <= 1) {
    const last = points[points.length - 1];
    return last ? [last] : [];
  }

  const result: PortfolioSnapshot[] = [];
  const lastIndex = points.length - 1;
  const step = lastIndex / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    const index = i === maxPoints - 1 ? lastIndex : Math.round(i * step);
    const point = points[index];
    if (point) result.push(point);
  }
  return result;
}

/** All snapshots for a user, ordered oldest to newest, optionally since a given time. */
export async function listSnapshots(
  db: Database,
  userId: string,
  since: Date | null,
): Promise<PortfolioSnapshot[]> {
  const rows = await db.query.portfolioSnapshots.findMany({
    where: since
      ? and(
          eq(portfolioSnapshots.userId, userId),
          gte(portfolioSnapshots.takenAt, since.toISOString()),
        )
      : eq(portfolioSnapshots.userId, userId),
    orderBy: asc(portfolioSnapshots.takenAt),
  });
  return rows.map((row) => ({
    takenAt: row.takenAt,
    totalValueUsd: row.totalValueUsd,
    investedUsd: row.investedUsd,
  }));
}

/** Inserts one snapshot row for a user at `takenAt`. */
export async function recordSnapshot(
  db: Database,
  userId: string,
  summary: PortfolioSummary,
  takenAt: string,
): Promise<void> {
  await db.insert(portfolioSnapshots).values({
    id: newId(),
    userId,
    takenAt,
    totalValueUsd: summary.totalValueUsd,
    investedUsd: summary.investedUsd,
  });
}
