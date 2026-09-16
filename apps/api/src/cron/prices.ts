import { eq } from 'drizzle-orm';
import { CRON } from '@crypto-tracker/shared';
import type { PriceProvider } from '../contracts';
import { createDb } from '../db/client';
import { alerts, transactions } from '../db/schema';
import { CACHE_TTL, priceKey, putJson } from '../services/cache';
import { fetchSimplePrices } from '../services/coingecko';
import type { CronJob } from './index';

export function createPriceRefreshJob(_deps: { prices: PriceProvider }): CronJob {
  return {
    name: 'price-refresh',
    cron: CRON.EVERY_MINUTE,
    async run(env) {
      const db = createDb(env);
      const [transactionCoins, alertCoins] = await Promise.all([
        db.selectDistinct({ coinId: transactions.coinId }).from(transactions),
        db.selectDistinct({ coinId: alerts.coinId }).from(alerts).where(eq(alerts.enabled, true)),
      ]);
      const ids = [
        ...new Set([
          ...transactionCoins.map((row) => row.coinId),
          ...alertCoins.map((row) => row.coinId),
        ]),
      ];

      if (ids.length === 0) {
        console.log('[cron:price-refresh] no coin ids to refresh');
        return;
      }

      const quotes = await fetchSimplePrices(ids);
      await Promise.all(
        Object.entries(quotes).map(([id, quote]) =>
          putJson(env.CACHE, priceKey(id), quote, CACHE_TTL.PRICE),
        ),
      );
      console.log(
        `[cron:price-refresh] refreshed ${Object.keys(quotes).length}/${ids.length} coin(s)`,
      );
    },
  };
}
