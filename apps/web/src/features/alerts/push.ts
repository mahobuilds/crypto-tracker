import type { PushSubscriptionInput, VapidPublicKeyResponse } from '@crypto-tracker/shared';
import { apiFetch } from '@/lib/api';

export type PushSubscribeResult = 'subscribed' | 'denied' | 'unsupported';

/** True when this browser can register a service worker push subscription. */
export function isPushSupported(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  } catch {
    return false;
  }
}

/** Current notification permission, or `'unsupported'` on browsers without push. */
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function toPushSubscriptionInput(subscription: PushSubscription): PushSubscriptionInput | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    return null;
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

/** Requests permission, subscribes with the Worker, and registers the subscription server-side. */
export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (!isPushSupported()) return 'unsupported';
  try {
    const { publicKey } = await apiFetch<VapidPublicKeyResponse>('/api/push/vapid-public-key');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });
    const input = toPushSubscriptionInput(subscription);
    if (!input) {
      await subscription.unsubscribe();
      return 'unsupported';
    }
    await apiFetch<void>('/api/push/subscribe', { method: 'POST', json: input });
    return 'subscribed';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return 'denied';
    }
    if (getPushPermission() === 'denied') {
      return 'denied';
    }
    throw error;
  }
}

/** Removes the subscription both server-side and from the browser. Safe to call when unsubscribed. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    try {
      await apiFetch<void>('/api/push/subscribe', {
        method: 'DELETE',
        json: { endpoint: subscription.endpoint },
      });
    } finally {
      await subscription.unsubscribe();
    }
  } catch {
    // best-effort cleanup; the subscription may already be gone
  }
}

/** The active push subscription for this device, or `null` when unsupported or not subscribed. */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}
