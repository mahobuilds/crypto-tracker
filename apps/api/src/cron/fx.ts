import { CRON } from '@crypto-tracker/shared';
import type { FxProvider } from '../contracts';
import { CACHE_TTL, fxKey, putJson } from '../services/cache';
import { fetchFxRates } from '../services/fx';
import type { CronJob } from './index';

export function createFxRefreshJob(_deps: { fx: FxProvider }): CronJob {
  return {
    name: 'fx-refresh',
    cron: CRON.EVERY_6_HOURS,
    async run(env) {
      const rates = await fetchFxRates();
      await putJson(env.CACHE, fxKey(), rates, CACHE_TTL.FX);
      console.log(`[cron:fx-refresh] refreshed fx rates as of ${rates.updatedAt}`);
    },
  };
}
