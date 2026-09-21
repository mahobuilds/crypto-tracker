import { Hono, type Context } from 'hono';
import {
  TRANSACTION_TYPES,
  transactionInputSchema,
  type TransactionListResponse,
  type TransactionType,
} from '@crypto-tracker/shared';
import type { CoinResolver, FxProvider, PriceProvider } from '../contracts';
import { createImportRoutes } from './import';
import { ApiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { snapshotAfterChange } from '../services/portfolio';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  rowToTransaction,
  updateTransaction,
  type TransactionFilter,
} from '../services/transactions';
import type { AppEnv } from '../types';

export interface TransactionsDeps {
  fx: FxProvider;
  coins: CoinResolver;
  prices: PriceProvider;
}

function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(value);
}

async function parseInput(c: Context<AppEnv>) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Body must be JSON');
  }
  const parsed = transactionInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid body';
    throw new ApiError(400, 'VALIDATION_ERROR', detail);
  }
  return parsed.data;
}

export function createTransactionsRoutes(deps: TransactionsDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
    .use(requireAuth)
    .get('/', async (c) => {
      const coinId = c.req.query('coinId');
      const walletId = c.req.query('walletId');
      const typeParam = c.req.query('type');
      if (typeParam !== undefined && !isTransactionType(typeParam)) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          `type must be one of ${TRANSACTION_TYPES.join(', ')}, got "${typeParam}"`,
        );
      }

      const filter: TransactionFilter = {};
      if (coinId) filter.coinId = coinId;
      if (walletId) filter.walletId = walletId;
      if (typeParam) filter.type = typeParam;

      const rows = await listTransactions(c.get('db'), c.get('user').id, filter);
      const body: TransactionListResponse = { transactions: rows.map(rowToTransaction) };
      return c.json(body);
    })
    .post('/', async (c) => {
      const input = await parseInput(c);
      const fx = await deps.fx.getFxRates(c.get('env'));
      const transaction = await createTransaction(c.get('db'), c.get('user').id, input, fx);
      await snapshotAfterChange(c.get('env'), c.get('db'), c.get('user').id, deps);
      return c.json(transaction, 201);
    })
    .put('/:id', async (c) => {
      const input = await parseInput(c);
      const fx = await deps.fx.getFxRates(c.get('env'));
      const transaction = await updateTransaction(
        c.get('db'),
        c.get('user').id,
        c.req.param('id'),
        input,
        fx,
      );
      await snapshotAfterChange(c.get('env'), c.get('db'), c.get('user').id, deps);
      return c.json(transaction);
    })
    .delete('/:id', async (c) => {
      await deleteTransaction(c.get('db'), c.get('user').id, c.req.param('id'));
      await snapshotAfterChange(c.get('env'), c.get('db'), c.get('user').id, deps);
      return c.body(null, 204);
    })
    .route('/import', createImportRoutes(deps));

  return app;
}
