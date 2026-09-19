import { Hono } from 'hono';
import {
  PORTFOLIO_VIEWS,
  historyRangeSchema,
  rangeToSince,
  type PortfolioHistoryResponse,
  type PortfolioView,
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

function parseView(raw: string | undefined): PortfolioView {
  if (raw === undefined) return 'whole';
  if ((PORTFOLIO_VIEWS as readonly string[]).includes(raw)) return raw as PortfolioView;
  throw new ApiError(
    400,
    'VALIDATION_ERROR',
    `view must be one of ${PORTFOLIO_VIEWS.join(', ')}, got "${raw}"`,
  );
}

export function createPortfolioRoutes(deps: PortfolioDeps): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/', async (c) => {
      const user = c.get('user');
      const db = c.get('db');
      const view = parseView(c.req.query('view'));
      const summary = await buildPortfolio(c.get('env'), db, user.id, deps, view);
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
