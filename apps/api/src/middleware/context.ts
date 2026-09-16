import type { MiddlewareHandler } from 'hono';
import { createAuth } from '../auth';
import { createDb } from '../db/client';
import type { AppEnv } from '../types';

/** Creates the Drizzle client and Better Auth instance for this request. */
export const withContext: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = createDb(c.env);
  c.set('db', db);
  c.set('auth', createAuth(c.env, db));
  await next();
};
