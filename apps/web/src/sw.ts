/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

// Equivalent of workbox-core's clientsClaim(): take control of open pages on activation.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

const DEFAULT_NOTIFICATION_TITLE = 'Crypto Tracker';
const DEFAULT_NOTIFICATION_URL = '/';

function parsePushPayload(event: PushEvent): PushPayload {
  try {
    return (event.data?.json() as PushPayload) ?? {};
  } catch {
    return {};
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const title = payload.title ?? DEFAULT_NOTIFICATION_TITLE;
  const url = payload.url ?? DEFAULT_NOTIFICATION_URL;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body,
      tag: payload.tag,
      data: { url },
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    (event.notification.data as { url?: string } | undefined)?.url ?? DEFAULT_NOTIFICATION_URL;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const targetUrl = new URL(url, self.location.origin).href;
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
