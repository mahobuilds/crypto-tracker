import { Hono } from 'hono';
import {
  walletInputSchema,
  type Wallet,
  type WalletInput,
  type WalletListResponse,
} from '@crypto-tracker/shared';
import { ApiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { createWallet, deleteWallet, listWallets, updateWallet } from '../services/wallets';
import type { AppEnv } from '../types';

async function readWalletInput(request: Request): Promise<WalletInput> {
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
  return result.data;
}

export function createWalletsRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/', async (c) => {
      const body: WalletListResponse = {
        wallets: await listWallets(c.get('db'), c.get('user').id),
      };
      return c.json(body);
    })
    .post('/', async (c) => {
      const input = await readWalletInput(c.req.raw);
      const body: Wallet = await createWallet(c.get('db'), c.get('user').id, input);
      return c.json(body, 201);
    })
    .put('/:id', async (c) => {
      const input = await readWalletInput(c.req.raw);
      const body: Wallet = await updateWallet(
        c.get('db'),
        c.get('user').id,
        c.req.param('id'),
        input,
      );
      return c.json(body);
    })
    .delete('/:id', async (c) => {
      await deleteWallet(c.get('db'), c.get('user').id, c.req.param('id'));
      return c.body(null, 204);
    });
}
