import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Alert, Language } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { IconButton } from '@/components/ui';
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
      className="animate-rise flex items-start gap-3 rounded-[var(--r-md)] bg-warn-soft px-4 py-3 text-ink"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-warn">
        <Icon.BellRinging weight="fill" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-semibold">{t('alerts.banner.title')}</p>
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {triggeredAlerts.map((alert) => (
            <li key={alert.id} className="text-caption text-ink-2">
              {t('alerts.banner.item', {
                coin: alert.coinSymbol.toUpperCase(),
                date: formatDateTime(alert.triggeredAt, language),
              })}
            </li>
          ))}
        </ul>
      </div>
      <IconButton aria-label={t('common.close')} onClick={handleDismiss} className="-me-2 -mt-1.5">
        <Icon.X />
      </IconButton>
    </div>
  );
}
