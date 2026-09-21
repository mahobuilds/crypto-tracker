import { asc, eq, gte, and, isNull } from 'drizzle-orm';
import {
  computePortfolio,
  type FxRates,
  type PortfolioSnapshot,
  type PortfolioSummary,
  type PortfolioView,
  type PriceQuote,
  type TransactionLike,
  type Wallet,
  type WalletBreakdownResponse,
  type WalletValuation,
} from '@crypto-tracker/shared';
import type { Database } from '../db/client';
import type { Env } from '../env';
import { portfolioSnapshots, transactions, type TransactionRow } from '../db/schema';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';
import type { PortfolioDeps } from '../routes/portfolio';
import { toTransactionLike } from './transactions';
import { listWallets } from './wallets';

/** Projects a DB row down to the fields the portfolio math needs (owner share included). */
export function rowToTransactionLike(row: TransactionRow): TransactionLike {
  return toTransactionLike(row);
}

/** Transactions of one wallet, or all of them when `walletId` is null. Pure. */
export function filterByWallet(
  txs: readonly TransactionLike[],
  walletId: string | null,
): TransactionLike[] {
  return walletId === null ? [...txs] : txs.filter((tx) => tx.walletId === walletId);
}

/**
 * Pure delegation seam: turns fetched transactions/prices/fx into a `PortfolioSummary`.
 * With a `walletId`, only that wallet's trades are counted.
 */
export function summarize(
  txs: readonly TransactionLike[],
  prices: Readonly<Record<string, PriceQuote | undefined>>,
  fx: FxRates,
  pricesUpdatedAt: string | null,
  view: PortfolioView = 'whole',
  walletId: string | null = null,
): PortfolioSummary {
  return computePortfolio({
    transactions: filterByWallet(txs, walletId),
    prices,
    fx,
    pricesUpdatedAt,
    view,
    walletId,
  });
}

/** Everything `GET /api/portfolio` needs, fetched once so both views can be built from it. */
export interface PortfolioInputs {
  txs: TransactionLike[];
  prices: Readonly<Record<string, PriceQuote | undefined>>;
  fx: FxRates;
  pricesUpdatedAt: string | null;
}

export async function loadPortfolioInputs(
  env: Env,
  db: Database,
  userId: string,
  deps: PortfolioDeps,
): Promise<PortfolioInputs> {
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
  });
  const txs = rows.map(rowToTransactionLike);

  if (txs.length === 0) {
    const fx = await deps.fx.getFxRates(env);
    return { txs, prices: {}, fx, pricesUpdatedAt: null };
  }

  const coinIds = [...new Set(txs.map((tx) => tx.coinId))];
  const [{ prices, updatedAt }, fx] = await Promise.all([
    deps.prices.getPrices(env, coinIds),
    deps.fx.getFxRates(env),
  ]);
  return { txs, prices, fx, pricesUpdatedAt: updatedAt };
}

/** Builds the `GET /api/portfolio?view=&walletId=` summary for a user from their stored transactions. */
export async function buildPortfolio(
  env: Env,
  db: Database,
  userId: string,
  deps: PortfolioDeps,
  view: PortfolioView = 'whole',
  walletId: string | null = null,
): Promise<PortfolioSummary> {
  const inputs = await loadPortfolioInputs(env, db, userId, deps);
  return summarize(inputs.txs, inputs.prices, inputs.fx, inputs.pricesUpdatedAt, view, walletId);
}

/** Values each wallet on its own from inputs fetched once. Pure. */
export function breakdownByWallet(
  wallets: readonly Wallet[],
  inputs: PortfolioInputs,
  view: PortfolioView = 'whole',
): WalletValuation[] {
  return wallets.map((wallet) => {
    const summary = summarize(
      inputs.txs,
      inputs.prices,
      inputs.fx,
      inputs.pricesUpdatedAt,
      view,
      wallet.id,
    );
    return {
      walletId: wallet.id,
      name: wallet.name,
      transactionCount: wallet.transactionCount,
      holdingsCount: summary.holdings.length,
      totalValueUsd: summary.totalValueUsd,
      investedUsd: summary.investedUsd,
      unrealizedPnlUsd: summary.unrealizedPnlUsd,
      unrealizedPnlPct: summary.unrealizedPnlPct,
      realizedPnlUsd: summary.realizedPnlUsd,
    };
  });
}

/** Builds the `GET /api/portfolio/wallets?view=` response. */
export async function buildWalletBreakdown(
  env: Env,
  db: Database,
  userId: string,
  deps: PortfolioDeps,
  wallets: readonly Wallet[],
  view: PortfolioView = 'whole',
): Promise<WalletBreakdownResponse> {
  const inputs = await loadPortfolioInputs(env, db, userId, deps);
  return {
    view,
    wallets: breakdownByWallet(wallets, inputs, view),
    fx: inputs.fx,
    pricesUpdatedAt: inputs.pricesUpdatedAt,
  };
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

/**
 * Snapshots for a user, ordered oldest to newest, optionally since a given time. `walletId`
 * null returns the whole-portfolio series; a wallet id returns that wallet's own series.
 */
export async function listSnapshots(
  db: Database,
  userId: string,
  since: Date | null,
  walletId: string | null = null,
): Promise<PortfolioSnapshot[]> {
  const conditions = [
    eq(portfolioSnapshots.userId, userId),
    walletId === null
      ? isNull(portfolioSnapshots.walletId)
      : eq(portfolioSnapshots.walletId, walletId),
  ];
  if (since) conditions.push(gte(portfolioSnapshots.takenAt, since.toISOString()));
  const rows = await db.query.portfolioSnapshots.findMany({
    where: and(...conditions),
    orderBy: asc(portfolioSnapshots.takenAt),
  });
  return rows.map((row) => ({
    takenAt: row.takenAt,
    totalValueUsd: row.totalValueUsd,
    investedUsd: row.investedUsd,
    ownTotalValueUsd: row.ownTotalValueUsd ?? null,
    ownInvestedUsd: row.ownInvestedUsd ?? null,
  }));
}

/**
 * Writes the snapshot rows for one moment: the whole portfolio plus one per wallet id given.
 * A wallet that no longer holds any trade still gets its row, so its chart drops to zero
 * instead of freezing at the last value it had.
 */
export async function recordSnapshots(
  db: Database,
  userId: string,
  inputs: PortfolioInputs,
  walletIds: readonly string[],
  takenAt: string,
): Promise<void> {
  const { txs, prices, fx, pricesUpdatedAt } = inputs;
  for (const walletId of [null, ...walletIds]) {
    const whole = summarize(txs, prices, fx, pricesUpdatedAt, 'whole', walletId);
    const mine = summarize(txs, prices, fx, pricesUpdatedAt, 'mine', walletId);
    await recordSnapshot(db, userId, whole, mine, takenAt, walletId);
  }
}

/**
 * Snapshots taken right after a trade is added, edited, moved or removed, so every wallet's
 * P&L chart shows the change now rather than at the next hourly run. A failure is logged and
 * swallowed: the trade itself is already saved and the hourly job catches up.
 */
export async function snapshotAfterChange(
  env: Env,
  db: Database,
  userId: string,
  deps: PortfolioDeps,
): Promise<void> {
  try {
    const [inputs, wallets] = await Promise.all([
      loadPortfolioInputs(env, db, userId, deps),
      listWallets(db, userId),
    ]);
    await recordSnapshots(
      db,
      userId,
      inputs,
      wallets.map((wallet) => wallet.id),
      nowIso(),
    );
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    console.error(`[portfolio-snapshot] after change failed for user ${userId}: ${reason}`);
  }
}

/**
 * Inserts one snapshot row for a user at `takenAt`, holding both the whole and owner's-share
 * totals. `walletId` null is the whole-portfolio row; a wallet id is that wallet's row.
 */
export async function recordSnapshot(
  db: Database,
  userId: string,
  whole: PortfolioSummary,
  mine: PortfolioSummary,
  takenAt: string,
  walletId: string | null = null,
): Promise<void> {
  await db.insert(portfolioSnapshots).values({
    id: newId(),
    userId,
    walletId,
    takenAt,
    totalValueUsd: whole.totalValueUsd,
    investedUsd: whole.investedUsd,
    ownTotalValueUsd: mine.totalValueUsd,
    ownInvestedUsd: mine.investedUsd,
  });
}
