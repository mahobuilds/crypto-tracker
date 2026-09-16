import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Alert, Language } from '@crypto-tracker/shared';
import { BellIcon, CloseIcon } from '@/components/icons';
import { isLanguage } from '@/i18n';
import { formatDateTime } from '@/lib/format';
import { useAlerts } from './queries';

const LAST_SEEN_KEY = 'crypto-tracker.alerts.lastSeen';

function readLastSeen(): string | null {
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(iso: string): void {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, iso);
  } catch {
    // localStorage unavailable (private mode, blocked cookies); nothing to persist
  }
}

function isTriggered(alert: Alert): alert is Alert & { triggeredAt: string } {
  return alert.triggeredAt !== null;
}

/**
 * Dismissible banner listing alerts that triggered since the viewer last dismissed it.
 * Mounted at the top of the app shell on every route, so it must never throw: it renders
 * nothing until `useAlerts()` resolves and treats a missing/blocked `localStorage` as "never seen".
 */
export function AlertBanner() {
  const { t, i18n } = useTranslation();
  const language: Language = isLanguage(i18n.language) ? i18n.language : 'en';
  const { data } = useAlerts();
  const [lastSeen, setLastSeen] = useState<string | null>(() => readLastSeen());
  const [dismissed, setDismissed] = useState(false);

  const triggeredAlerts = useMemo(() => {
    if (!data) return [];
    return data.alerts
      .filter(isTriggered)
      .filter((alert) => !lastSeen || alert.triggeredAt > lastSeen)
      .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
  }, [data, lastSeen]);

  useEffect(() => {
    setDismissed(false);
  }, [triggeredAlerts.length]);

  if (dismissed || triggeredAlerts.length === 0) {
    return null;
  }

  function handleDismiss() {
    const now = new Date().toISOString();
    writeLastSeen(now);
    setLastSeen(now);
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className="mx-auto mb-4 flex w-full max-w-5xl items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
    >
      <BellIcon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold">{t('alerts.banner.title')}</p>
        <ul className="mt-1 flex flex-col gap-1">
          {triggeredAlerts.map((alert) => (
            <li key={alert.id} className="text-sm">
              {t('alerts.banner.item', {
                coin: alert.coinSymbol.toUpperCase(),
                date: formatDateTime(alert.triggeredAt, language),
              })}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('common.close')}
        className="touch-target inline-flex items-center justify-center rounded-xl text-indigo-700 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900"
      >
        <CloseIcon className="size-5" />
      </button>
    </div>
  );
}
