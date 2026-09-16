import { Hono } from 'hono';
import {
  historyRangeSchema,
  rangeToSince,
  type PortfolioHistoryResponse,
} from '@crypto-tracker/shared';
import { buildPortfolio, downsample, listSnapshots } from '../services/portfolio';
import { ApiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';
import type { FxProvider, PriceProvider } from '../contracts';

const MAX_HISTORY_POINTS = 500;

export interface PortfolioDeps {
  prices: PriceProvider;
  fx: FxProvider;
}

export function createPortfolioRoutes(deps: PortfolioDeps): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/', async (c) => {
      const user = c.get('user');
      const db = c.get('db');
      const summary = await buildPortfolio(c.env, db, user.id, deps);
      return c.json(summary);
    })
    .get('/history', async (c) => {
      const raw = c.req.query('range') ?? '30d';
      const parsed = historyRangeSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ApiError(400, 'VALIDATION_ERROR', `range must be one of the supported ranges`);
      }
      const range = parsed.data;
      const user = c.get('user');
      const db = c.get('db');
      const since = rangeToSince(range, new Date());
      const points = downsample(await listSnapshots(db, user.id, since), MAX_HISTORY_POINTS);
      const body: PortfolioHistoryResponse = { range, points };
      return c.json(body);
    });
}
