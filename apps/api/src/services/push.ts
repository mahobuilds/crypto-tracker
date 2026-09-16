import { and, eq } from 'drizzle-orm';
import webpush, { WebPushError } from 'web-push';
import type { PushSubscriptionInput } from '@crypto-tracker/shared';
import type { Database } from '../db/client';
import { pushSubscriptions, type PushSubscriptionRow } from '../db/schema';
import type { Env } from '../env';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export type PushResult = 'sent' | 'gone' | 'failed';

/**
 * Encrypts and delivers one Web Push message. Never throws. `'gone'` means the
 * push service no longer knows the subscription and the caller should delete it.
 */
export async function sendPush(
  env: Env,
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<PushResult> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.error(
      `[push] delivery failed for subscription ${sub.id}: VAPID keys are not configured`,
    );
    return 'failed';
  }
  try {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: { auth: sub.auth, p256dh: sub.p256dh },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url,
        tag: payload.tag,
      }),
    );
    return 'sent';
  } catch (err) {
    if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
      return 'gone';
    }
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[push] delivery failed for subscription ${sub.id}: ${reason}`);
    return 'failed';
  }
}

export async function upsertSubscription(
  db: Database,
  userId: string,
  input: PushSubscriptionInput,
): Promise<void> {
  const keys = { userId, p256dh: input.keys.p256dh, auth: input.keys.auth };
  await db
    .insert(pushSubscriptions)
    .values({ id: newId(), endpoint: input.endpoint, createdAt: nowIso(), ...keys })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: keys });
}

export async function deleteSubscription(
  db: Database,
  userId: string,
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function listSubscriptions(
  db: Database,
  userId: string,
): Promise<PushSubscriptionRow[]> {
  return db.query.pushSubscriptions.findMany({ where: eq(pushSubscriptions.userId, userId) });
}
