import { Hono } from 'hono';
import type { CoinSearchResponse } from '@crypto-tracker/shared';
import type { CoinResolver } from '../contracts';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const MAX_QUERY_LENGTH = 50;

export function createCoinsRoutes(deps: { coins: CoinResolver }): Hono<AppEnv> {
  return new Hono<AppEnv>().use(requireAuth).get('/search', async (c) => {
    const query = (c.req.query('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
    const results = await deps.coins.searchCoins(c.get('env'), query);
    const body: CoinSearchResponse = { results };
    return c.json(body);
  });
}
