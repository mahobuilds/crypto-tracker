import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import type { MemoryCache } from '../lib/memory-cache';
import { createTokenVerifier } from './index';

const SECRET = 'test-hs256-secret-at-least-32-bytes-long';
const SUPABASE_URL = 'https://example.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;

function makeEnv() {
  return {
    APP_ORIGIN: 'http://localhost:5173',
    PORT: 8787,
    DATABASE_URL: 'postgres://localhost/test',
    SUPABASE_URL,
    SUPABASE_JWT_SECRET: SECRET,
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: 'mailto:admin@example.com',
    CACHE: {} as MemoryCache,
  };
}

async function signToken(overrides: {
  sub?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  aud?: string;
  iss?: string;
  expiresIn?: string;
}): Promise<string> {
  const key = new TextEncoder().encode(SECRET);
  return new SignJWT({
    email: overrides.email ?? 'jane@example.com',
    user_metadata: overrides.user_metadata ?? { full_name: 'Jane Doe' },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(overrides.sub ?? 'user-123')
    .setIssuer(overrides.iss ?? ISSUER)
    .setAudience(overrides.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? '1h')
    .sign(key);
}

describe('createTokenVerifier', () => {
  it('maps claims to an AuthUser', async () => {
    const token = await signToken({
      sub: 'user-123',
      email: 'jane@example.com',
      user_metadata: { full_name: 'Jane Doe', avatar_url: 'https://img/jane.png' },
    });
    const verify = createTokenVerifier(makeEnv());
    await expect(verify(token)).resolves.toEqual({
      id: 'user-123',
      email: 'jane@example.com',
      name: 'Jane Doe',
      image: 'https://img/jane.png',
    });
  });

  it('falls back to name, then email, when full_name is absent; picture when avatar_url is absent', async () => {
    const token = await signToken({
      user_metadata: { name: 'J. Doe', picture: 'https://img/j.png' },
    });
    const verify = createTokenVerifier(makeEnv());
    await expect(verify(token)).resolves.toEqual({
      id: 'user-123',
      email: 'jane@example.com',
      name: 'J. Doe',
      image: 'https://img/j.png',
    });
  });

  it('rejects a token signed with the wrong secret', async () => {
    const badKey = new TextEncoder().encode('a-completely-different-secret-value');
    const token = await new SignJWT({ email: 'jane@example.com', user_metadata: {} })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-123')
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(badKey);
    const verify = createTokenVerifier(makeEnv());
    await expect(verify(token)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Sign in required',
    });
  });

  it('rejects an expired token with "Session expired"', async () => {
    const token = await signToken({ expiresIn: '-1h' });
    const verify = createTokenVerifier(makeEnv());
    await expect(verify(token)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Session expired',
    });
  });

  it('rejects a token with the wrong audience', async () => {
    const token = await signToken({ aud: 'not-authenticated' });
    const verify = createTokenVerifier(makeEnv());
    await expect(verify(token)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Sign in required',
    });
  });
});
