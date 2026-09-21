import { Hono, type Context } from 'hono';
import {
  PORTFOLIO_VIEWS,
  historyRangeSchema,
  rangeToSince,
  type PortfolioHistoryResponse,
  type PortfolioView,
} from '@crypto-tracker/shared';
import {
  buildPortfolio,
  buildWalletBreakdown,
  downsample,
  listSnapshots,
} from '../services/portfolio';
import { getWalletRow, listWallets } from '../services/wallets';
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

/** `walletId` query: absent or empty means every wallet; otherwise it must be the user's own. */
async function parseWalletId(c: Context<AppEnv>, raw: string | undefined): Promise<string | null> {
  if (raw === undefined || raw === '') return null;
  return (await getWalletRow(c.get('db'), c.get('user').id, raw)).id;
}

export function createPortfolioRoutes(deps: PortfolioDeps): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/', async (c) => {
      const user = c.get('user');
      const db = c.get('db');
      const view = parseView(c.req.query('view'));
      const walletId = await parseWalletId(c, c.req.query('walletId'));
      const summary = await buildPortfolio(c.get('env'), db, user.id, deps, view, walletId);
      return c.json(summary);
    })
    .get('/wallets', async (c) => {
      const user = c.get('user');
      const db = c.get('db');
      const view = parseView(c.req.query('view'));
      const wallets = await listWallets(db, user.id);
      const body = await buildWalletBreakdown(c.get('env'), db, user.id, deps, wallets, view);
      return c.json(body);
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
      const walletId = await parseWalletId(c, c.req.query('walletId'));
      const points = downsample(
        await listSnapshots(db, user.id, since, walletId),
        MAX_HISTORY_POINTS,
      );
      const body: PortfolioHistoryResponse = { range, points };
      return c.json(body);
    });
}
