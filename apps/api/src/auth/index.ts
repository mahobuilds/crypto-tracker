import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Env } from '../env';
import { ApiError } from '../lib/errors';

/** The authenticated user, mapped from Supabase JWT claims. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

/** Thrown when the `Authorization` header is missing, malformed, or the token fails verification. */
export class AuthError extends ApiError {
  constructor(message: string) {
    super(401, 'UNAUTHORIZED', message);
  }
}

interface SupabaseUserMetadata {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
}

function toAuthUser(payload: JWTPayload): AuthUser {
  const id = payload.sub;
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  if (!id || !email) {
    throw new AuthError('Sign in required');
  }
  const metadata = (payload.user_metadata ?? {}) as SupabaseUserMetadata;
  return {
    id,
    email,
    name: metadata.full_name ?? metadata.name ?? email,
    image: metadata.avatar_url ?? metadata.picture ?? null,
  };
}

/** Creates a token verifier bound to `env`, caching the JWKS resolver across calls. */
export function createTokenVerifier(env: Env): (token: string) => Promise<AuthUser> {
  const issuer = new URL('/auth/v1', env.SUPABASE_URL).toString();
  const secret = env.SUPABASE_JWT_SECRET;
  const key = secret
    ? new TextEncoder().encode(secret)
    : createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL));

  return async (token: string): Promise<AuthUser> => {
    try {
      const { payload } = await jwtVerify(token, key, {
        issuer,
        audience: 'authenticated',
      });
      return toAuthUser(payload);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      const code = (error as { code?: string } | undefined)?.code;
      if (code === 'ERR_JWT_EXPIRED') {
        throw new AuthError('Session expired');
      }
      throw new AuthError('Sign in required');
    }
  };
}
