import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushSubscriptionRow } from '../db/schema';
import type { Env } from '../env';
import { MemoryCache } from '../lib/memory-cache';
import { sendPush, type PushPayload } from './push';

const { sendNotification, setVapidDetails, MockWebPushError } = vi.hoisted(() => {
  class MockWebPushError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number,
    ) {
      super(message);
      this.name = 'WebPushError';
    }
  }
  return { sendNotification: vi.fn(), setVapidDetails: vi.fn(), MockWebPushError };
});

vi.mock('web-push', () => ({
  default: { sendNotification, setVapidDetails },
  WebPushError: MockWebPushError,
}));

const env: Env = {
  APP_ORIGIN: 'http://localhost:5173',
  PORT: 8787,
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  SUPABASE_URL: 'https://example.supabase.co',
  VAPID_SUBJECT: 'mailto:alerts@example.com',
  VAPID_PUBLIC_KEY: 'public-key',
  VAPID_PRIVATE_KEY: 'private-key',
  CACHE: new MemoryCache(),
};

const sub: PushSubscriptionRow = {
  id: 'sub-1',
  userId: 'user-1',
  endpoint: 'https://push.example.com/send/abc123',
  p256dh: 'p256dh-key',
  auth: 'auth-secret',
  createdAt: '2026-09-15T10:00:00.000Z',
};

const payload: PushPayload = {
  title: 'BTC ≥ $70,000',
  body: 'Now $70,123.46',
  url: '/alerts',
  tag: 'alert-1',
};

beforeEach(() => {
  sendNotification.mockReset();
  setVapidDetails.mockReset();
});

describe('sendPush', () => {
  it('signs with VAPID, sends the encoded payload and returns "sent" on success', async () => {
    sendNotification.mockResolvedValueOnce({ statusCode: 201, body: '', headers: {} });

    await expect(sendPush(env, sub, payload)).resolves.toBe('sent');

    expect(setVapidDetails).toHaveBeenCalledWith(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    expect(sendNotification).toHaveBeenCalledTimes(1);
    const [subscription, body] = sendNotification.mock.calls[0] ?? [];
    expect(subscription).toEqual({
      endpoint: sub.endpoint,
      expirationTime: null,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    });
    expect(JSON.parse(body as string)).toEqual({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
    });
  });

  it('returns "gone" on 404 and 410 so the caller can delete the subscription', async () => {
    sendNotification.mockRejectedValueOnce(new MockWebPushError('Not Found', 404));
    await expect(sendPush(env, sub, payload)).resolves.toBe('gone');

    sendNotification.mockRejectedValueOnce(new MockWebPushError('Gone', 410));
    await expect(sendPush(env, sub, payload)).resolves.toBe('gone');
  });

  it('returns "failed" on other push errors without throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      sendNotification.mockRejectedValueOnce(new MockWebPushError('Server error', 500));
      await expect(sendPush(env, sub, payload)).resolves.toBe('failed');

      sendNotification.mockRejectedValueOnce(new Error('network down'));
      await expect(sendPush(env, sub, payload)).resolves.toBe('failed');

      expect(error).toHaveBeenCalledTimes(2);
    } finally {
      error.mockRestore();
    }
  });

  it('returns "failed" when the VAPID keys are missing instead of throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const broken: Env = { ...env, VAPID_PRIVATE_KEY: '' };
      await expect(sendPush(broken, sub, payload)).resolves.toBe('failed');
      expect(sendNotification).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});
