import { Hono } from 'hono';
import type { FxRates, PricesResponse } from '@crypto-tracker/shared';
import type { FxProvider, PriceProvider } from '../contracts';
import { ApiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const MAX_IDS = 100;

function parseIds(raw: string | undefined): string[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter((id) => id.length > 0);
  return [...new Set(ids)];
}

export function createPricesRoutes(deps: { prices: PriceProvider; fx: FxProvider }): Hono<AppEnv> {
  return new Hono<AppEnv>().use(requireAuth).get('/', async (c) => {
    const ids = parseIds(c.req.query('ids'));
    if (ids.length > MAX_IDS) {
      throw new ApiError(400, 'TOO_MANY_IDS', `At most ${MAX_IDS} coin ids are allowed`);
    }
    const { prices, updatedAt } = await deps.prices.getPrices(c.env, ids);
    const body: PricesResponse = { prices, updatedAt };
    return c.json(body);
  });
}

export function createFxRoutes(deps: { fx: FxProvider }): Hono<AppEnv> {
  return new Hono<AppEnv>().use(requireAuth).get('/', async (c) => {
    const rates = await deps.fx.getFxRates(c.env);
    const body: FxRates = rates;
    return c.json(body);
  });
}
