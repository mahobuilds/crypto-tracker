import type { MiddlewareHandler } from 'hono';
import { ApiError } from '../lib/errors';
import type { AppEnv } from '../types';

/** Resolves the Better Auth session; sets `user` or throws 401. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await c.get('auth').api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Sign in required');
  }
  c.set('user', session.user);
  await next();
};
