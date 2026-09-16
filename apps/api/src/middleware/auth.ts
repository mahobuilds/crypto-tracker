import type { MiddlewareHandler } from 'hono';
import { AuthError, createTokenVerifier, type AuthUser } from '../auth';
import type { AppEnv } from '../types';

let verifyToken: ((token: string) => Promise<AuthUser>) | undefined;

/** Parses `Authorization: Bearer <token>`, verifies it against Supabase, and sets `user`. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization') ?? c.req.header('authorization');
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) {
    throw new AuthError('Sign in required');
  }
  if (!verifyToken) {
    verifyToken = createTokenVerifier(c.get('env'));
  }
  const user = await verifyToken(token);
  c.set('user', user);
  await next();
};
