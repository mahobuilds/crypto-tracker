import type { MiddlewareHandler } from 'hono';
import type { Database } from '../db/client';
import type { Env } from '../env';
import type { AppEnv } from '../types';

/** Puts the process-wide env and database client on every request context. */
export function withContext(env: Env, db: Database): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set('env', env);
    c.set('db', db);
    await next();
  };
}
