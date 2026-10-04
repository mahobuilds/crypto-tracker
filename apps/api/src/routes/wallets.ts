import { Hono } from 'hono';
import {
  walletInputSchema,
  type Wallet,
  type WalletInput,
  type WalletListResponse,
} from '@crypto-tracker/shared';
import { ApiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { snapshotAfterChange } from '../services/portfolio';
import { createWallet, deleteWallet, listWallets, updateWallet } from '../services/wallets';
import type { AppEnv } from '../types';
import type { PortfolioDeps } from './portfolio';

/** The parsed body, and whether it carried a split at all (older app versions send only a name). */
async function readWalletInput(
  request: Request,
): Promise<{ input: WalletInput; hasSplit: boolean }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'body: Expected a JSON object');
  }
  const result = walletInputSchema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') || 'body';
    throw new ApiError(400, 'VALIDATION_ERROR', `${path}: ${issue?.message ?? 'Invalid input'}`);
  }
  const hasSplit = typeof body === 'object' && body !== null && 'scope' in body;
  return { input: result.data, hasSplit };
}

export function createWalletsRoutes(deps: PortfolioDeps): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/', async (c) => {
      const body: WalletListResponse = {
        wallets: await listWallets(c.get('db'), c.get('user').id),
      };
      return c.json(body);
    })
    .post('/', async (c) => {
      const { input } = await readWalletInput(c.req.raw);
      const body: Wallet = await createWallet(c.get('db'), c.get('user').id, input);
      return c.json(body, 201);
    })
    .put('/:id', async (c) => {
      const { input, hasSplit } = await readWalletInput(c.req.raw);
      const body: Wallet = await updateWallet(
        c.get('db'),
        c.get('user').id,
        c.req.param('id'),
        input,
        { keepSplit: !hasSplit },
      );
      // A new split changes the owner's share of every trade in the wallet.
      await snapshotAfterChange(c.get('env'), c.get('db'), c.get('user').id, deps);
      return c.json(body);
    })
    .delete('/:id', async (c) => {
      await deleteWallet(c.get('db'), c.get('user').id, c.req.param('id'));
      return c.body(null, 204);
    });
}
