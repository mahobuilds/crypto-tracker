import { Hono } from 'hono';
import { z } from 'zod';
import { pushSubscriptionSchema, type VapidPublicKeyResponse } from '@crypto-tracker/shared';
import { ApiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { deleteSubscription, upsertSubscription } from '../services/push';
import type { AppEnv } from '../types';

const unsubscribeSchema = z.object({ endpoint: z.string().min(1) });

async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'body: Expected a JSON object');
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') || 'body';
    throw new ApiError(400, 'VALIDATION_ERROR', `${path}: ${issue?.message ?? 'Invalid input'}`);
  }
  return result.data;
}

export function createPushRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/vapid-public-key', (c) => {
      const publicKey = c.env.VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new ApiError(500, 'NOT_CONFIGURED', 'Push notifications are not configured');
      }
      const body: VapidPublicKeyResponse = { publicKey };
      return c.json(body);
    })
    .post('/subscribe', async (c) => {
      const input = await readBody(c.req.raw, pushSubscriptionSchema);
      await upsertSubscription(c.get('db'), c.get('user').id, input);
      return c.json({ ok: true }, 201);
    })
    .delete('/subscribe', async (c) => {
      const { endpoint } = await readBody(c.req.raw, unsubscribeSchema);
      await deleteSubscription(c.get('db'), c.get('user').id, endpoint);
      return c.body(null, 204);
    });
}
