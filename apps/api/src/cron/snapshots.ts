import { CRON } from '@crypto-tracker/shared';
import { createDb } from '../db/client';
import type { Env } from '../env';
import { transactions } from '../db/schema';
import { nowIso } from '../lib/time';
import { loadPortfolioInputs, recordSnapshot, summarize } from '../services/portfolio';
import type { PortfolioDeps } from '../routes/portfolio';
import type { CronJob } from './index';

/** Records one portfolio snapshot per user with at least one transaction, every hour. */
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
          const whole = summarize(txs, prices, fx, pricesUpdatedAt, 'whole');
          const mine = summarize(txs, prices, fx, pricesUpdatedAt, 'mine');
          await recordSnapshot(db, userId, whole, mine, takenAt);
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
