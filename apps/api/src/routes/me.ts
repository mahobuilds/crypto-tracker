import { Hono } from 'hono';
import type { MeResponse } from '@crypto-tracker/shared';
import { getOrCreateSettings } from '../db/settings';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

export const meRoutes = new Hono<AppEnv>().use(requireAuth).get('/', async (c) => {
  const user = c.get('user');
  const body: MeResponse = {
    user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null },
    settings: await getOrCreateSettings(c.get('db'), user.id),
  };
  return c.json(body);
});
