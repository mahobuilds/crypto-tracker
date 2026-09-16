import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PushSubscriptionRow } from '../db/schema';
import { sendPush, type PushPayload } from './push';

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  if (!jwk.d) throw new Error('private key export did not include d');
  return { publicKey: base64url(raw), privateKey: jwk.d };
}

async function generateSubscription(): Promise<PushSubscriptionRow> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);
  const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
  return {
    id: 'sub-1',
    userId: 'user-1',
    endpoint: 'https://push.example.com/send/abc123',
    p256dh: base64url(raw),
    auth: base64url(crypto.getRandomValues(new Uint8Array(16))),
    createdAt: '2026-09-15T10:00:00.000Z',
  };
}

const payload: PushPayload = {
  title: 'BTC ≥ $70,000',
  body: 'Now $70,123.46',
  url: '/alerts',
  tag: 'alert-1',
};

type FetchImpl = typeof fetch;

function fakeFetch(status: number): {
  impl: FetchImpl;
  calls: { url: string; init: RequestInit }[];
} {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl: FetchImpl = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(null, { status });
  };
  return { impl, calls };
}

let env: Env;
let sub: PushSubscriptionRow;

beforeAll(async () => {
  const vapid = await generateVapidKeys();
  env = {
    VAPID_SUBJECT: 'mailto:alerts@example.com',
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
  } as unknown as Env;
  sub = await generateSubscription();
});

describe('sendPush', () => {
  it('encrypts the payload, signs it with VAPID and returns "sent" on 2xx', async () => {
    const { impl, calls } = fakeFetch(201);
    await expect(sendPush(env, sub, payload, impl)).resolves.toBe('sent');

    expect(calls).toHaveLength(1);
    const call = calls[0];
    if (!call) throw new Error('fetch was not called');
    expect(call.url).toBe(sub.endpoint);
    expect(call.init.method?.toUpperCase()).toBe('POST');

    const headers = call.init.headers as Record<string, string>;
    expect(headers.authorization).toMatch(
      /^vapid t=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+, k=/,
    );
    expect(headers.authorization).toContain(`k=${env.VAPID_PUBLIC_KEY}`);
    expect(headers['content-encoding']).toBe('aes128gcm');
    expect(headers.ttl).toBe('3600');
    expect(headers.urgency).toBe('high');

    const body = call.init.body;
    expect(body).toBeInstanceOf(Uint8Array);
    const bytes = body as Uint8Array;
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(new TextDecoder().decode(bytes)).not.toContain(payload.title);
  });

  it('returns "gone" on 404 and 410 so the caller can delete the subscription', async () => {
    await expect(sendPush(env, sub, payload, fakeFetch(404).impl)).resolves.toBe('gone');
    await expect(sendPush(env, sub, payload, fakeFetch(410).impl)).resolves.toBe('gone');
  });

  it('returns "failed" on other non-2xx statuses without throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(sendPush(env, sub, payload, fakeFetch(500).impl)).resolves.toBe('failed');
      await expect(sendPush(env, sub, payload, fakeFetch(429).impl)).resolves.toBe('failed');
      expect(error).toHaveBeenCalledTimes(2);
    } finally {
      error.mockRestore();
    }
  });

  it('returns "failed" when fetch throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const throwing: FetchImpl = async () => {
        throw new Error('network down');
      };
      await expect(sendPush(env, sub, payload, throwing)).resolves.toBe('failed');
      expect(error).toHaveBeenCalledTimes(1);
      const [message] = error.mock.calls[0] ?? [];
      expect(String(message)).toContain('network down');
      expect(String(message)).not.toContain(sub.p256dh);
      expect(String(message)).not.toContain(env.VAPID_PRIVATE_KEY);
    } finally {
      error.mockRestore();
    }
  });

  it('returns "failed" when the VAPID keys are missing instead of throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const broken = { ...env, VAPID_PRIVATE_KEY: '' } as Env;
      const { impl, calls } = fakeFetch(201);
      await expect(sendPush(broken, sub, payload, impl)).resolves.toBe('failed');
      expect(calls).toHaveLength(0);
    } finally {
      error.mockRestore();
    }
  });
});
