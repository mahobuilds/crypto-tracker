import { CRON } from '@crypto-tracker/shared';
import { createDb } from '../db/client';
import type { Env } from '../env';
import { transactions } from '../db/schema';
import { nowIso } from '../lib/time';
import { loadPortfolioInputs, recordSnapshot, summarize } from '../services/portfolio';
import type { PortfolioDeps } from '../routes/portfolio';
import type { CronJob } from './index';

/** Distinct wallet ids that hold at least one of the given transactions. Pure. */
export function walletIdsOf(txs: readonly { walletId?: string }[]): string[] {
  return [...new Set(txs.flatMap((tx) => (tx.walletId ? [tx.walletId] : [])))];
}

/**
 * Records portfolio snapshots for every user with at least one transaction, every hour: one
 * row for the whole portfolio plus one per wallet that holds a trade.
 */
export function createSnapshotJob(deps: PortfolioDeps): CronJob {
  return {
    name: 'portfolio-snapshot',
    cron: CRON.HOURLY,
    async run(env: Env): Promise<void> {
      const db = createDb(env);
      const rows = await db.selectDistinct({ userId: transactions.userId }).from(transactions);
      const takenAt = nowIso();

      const results = await Promise.allSettled(
        rows.map(async ({ userId }) => {
          const { txs, prices, fx, pricesUpdatedAt } = await loadPortfolioInputs(
            env,
            db,
            userId,
            deps,
          );
          for (const walletId of [null, ...walletIdsOf(txs)]) {
            const whole = summarize(txs, prices, fx, pricesUpdatedAt, 'whole', walletId);
            const mine = summarize(txs, prices, fx, pricesUpdatedAt, 'mine', walletId);
            await recordSnapshot(db, userId, whole, mine, takenAt, walletId);
          }
        }),
      );

      let written = 0;
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          written += 1;
        } else {
          console.error(
            `[portfolio-snapshot] failed for user ${rows[i]?.userId ?? 'unknown'}: ${describeReason(result.reason)}`,
          );
        }
      });
      console.log(`snapshots written: ${written}`);
    },
  };
}

function describeReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason);
}
