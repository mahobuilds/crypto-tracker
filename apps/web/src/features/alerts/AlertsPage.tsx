import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Alert } from '@crypto-tracker/shared';
import { useSettings } from '@/app/settings/SettingsProvider';
import { BellIcon, PencilIcon, PlusIcon, TrashIcon } from '@/components/icons';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Spinner,
} from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { useFx } from '@/hooks/useFx';
import { usePrices } from '@/hooks/usePrices';
import { ApiRequestError } from '@/lib/api';
import { formatDateTime, formatFiat, formatMoneyUsd } from '@/lib/format';
import { AlertForm } from './AlertForm';
import {
  getCurrentSubscription,
  getPushPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from './push';
import { useAlerts, useDeleteAlert, useUpdateAlert } from './queries';

type AlertStatus = 'active' | 'paused' | 'triggered';
type PushStatus = 'unsupported' | 'blocked' | 'off' | 'on';

const STATUS_ORDER: Record<AlertStatus, number> = { active: 0, paused: 1, triggered: 2 };
const STATUS_TONE: Record<AlertStatus, BadgeTone> = {
  active: 'info',
  paused: 'neutral',
  triggered: 'positive',
};

function alertStatus(alert: Alert): AlertStatus {
  if (alert.triggeredAt) return 'triggered';
  return alert.enabled ? 'active' : 'paused';
}

function usePushStatus() {
  const [status, setStatus] = useState<PushStatus>('unsupported');
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus('unsupported');
      return;
    }
    if (getPushPermission() === 'denied') {
      setStatus('blocked');
      return;
    }
    const subscription = await getCurrentSubscription();
    setStatus(subscription ? 'on' : 'off');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(async () => {
    setIsBusy(true);
    try {
      if (status === 'on') {
        await unsubscribeFromPush();
      } else {
        const result = await subscribeToPush();
        if (result === 'denied') {
          setStatus('blocked');
          return;
        }
      }
      await refresh();
    } finally {
      setIsBusy(false);
    }
  }, [status, refresh]);

  return { status, isBusy, toggle };
}

interface AlertRowProps {
  alert: Alert;
  currentPriceUsd: number | null;
  onEdit: () => void;
}

function AlertRow({ alert, currentPriceUsd, onEdit }: AlertRowProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { fx } = useFx();
  const deleteAlert = useDeleteAlert();
  const updateAlert = useUpdateAlert();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const status = alertStatus(alert);
  const directionSymbol = alert.direction === 'above' ? '≥' : '≤';
  const targetUsdText = formatFiat(alert.targetPriceUsd, 'USD', settings.language);
  const targetBaseHint =
    fx && settings.baseCurrency !== 'USD'
      ? formatMoneyUsd(alert.targetPriceUsd, settings.baseCurrency, fx, settings.language)
      : null;

  async function handleDelete() {
    await deleteAlert.mutateAsync(alert.id);
    setConfirmingDelete(false);
  }

  async function handleRearm() {
    await updateAlert.mutateAsync({
      id: alert.id,
      input: {
        coinId: alert.coinId,
        coinSymbol: alert.coinSymbol,
        coinName: alert.coinName,
        targetPriceUsd: alert.targetPriceUsd,
        direction: alert.direction,
        enabled: true,
      },
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">{alert.coinName}</span>
          <span className="text-sm text-slate-600 uppercase dark:text-slate-400">
            {alert.coinSymbol}
          </span>
        </div>
        <Badge tone={STATUS_TONE[status]}>
          {status === 'triggered' && alert.triggeredAt
            ? t('alerts.list.triggeredAt', {
                date: formatDateTime(alert.triggeredAt, settings.language),
              })
            : t(`alerts.list.${status}`)}
        </Badge>
      </div>
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {directionSymbol} {targetUsdText}
          {targetBaseHint ? ` (≈ ${targetBaseHint})` : ''}
        </p>
        {currentPriceUsd !== null ? (
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            {t('alerts.list.currentPrice', {
              price: formatFiat(currentPriceUsd, 'USD', settings.language),
            })}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status !== 'active' ? (
          <Button
            variant="secondary"
            onClick={() => void handleRearm()}
            loading={updateAlert.isPending}
          >
            {t('alerts.actions.rearm')}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onEdit} aria-label={t('common.edit')}>
          <PencilIcon className="size-5" />
        </Button>
        <Button
          variant="danger"
          onClick={() => setConfirmingDelete(true)}
          loading={deleteAlert.isPending}
          aria-label={t('common.delete')}
        >
          <TrashIcon className="size-5" />
        </Button>
      </div>

      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={t('alerts.actions.deleteTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={deleteAlert.isPending}
              onClick={() => void handleDelete()}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-base text-slate-700 dark:text-slate-300">
          {t('alerts.actions.confirmDelete', { coin: alert.coinSymbol })}
        </p>
      </Dialog>
    </li>
  );
}

export function AlertsPage() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const alertsQuery = useAlerts();
  const pushStatus = usePushStatus();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  const alerts = useMemo(() => {
    const list = alertsQuery.data?.alerts ?? [];
    return [...list].sort((a, b) => STATUS_ORDER[alertStatus(a)] - STATUS_ORDER[alertStatus(b)]);
  }, [alertsQuery.data]);

  const coinIds = useMemo(() => Array.from(new Set(alerts.map((alert) => alert.coinId))), [alerts]);
  const { prices } = usePrices(coinIds);

  function openCreate() {
    setEditingAlert(null);
    setFormOpen(true);
  }

  function openEdit(alert: Alert) {
    setEditingAlert(alert);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingAlert(null);
  }

  const pushStatusLabel = t(`alerts.notifications.status.${pushStatus.status}`);
  const pushToggleLabel =
    pushStatus.status === 'on'
      ? t('alerts.notifications.disable')
      : t('alerts.notifications.enable');

  return (
    <>
      <PageHeader
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="size-5" />
            {t('alerts.newAlert')}
          </Button>
        }
      />

      {!settings.alertsEnabled ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('alerts.offCard.title')}</CardTitle>
          </CardHeader>
          <p className="text-base text-slate-600 dark:text-slate-400">
            {t('alerts.offCard.description')}
          </p>
          <Button className="mt-4" onClick={() => void updateSettings({ alertsEnabled: true })}>
            {t('alerts.offCard.enable')}
          </Button>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('alerts.notifications.title')}</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-base text-slate-600 dark:text-slate-400">{pushStatusLabel}</p>
          {pushStatus.status === 'unsupported' || pushStatus.status === 'blocked' ? null : (
            <Button
              variant="secondary"
              onClick={() => void pushStatus.toggle()}
              loading={pushStatus.isBusy}
            >
              {pushToggleLabel}
            </Button>
          )}
        </div>
      </Card>

      {alertsQuery.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : alertsQuery.isError ? (
        <ErrorMessage
          message={
            alertsQuery.error instanceof ApiRequestError
              ? alertsQuery.error.message
              : t('errors.generic')
          }
          onRetry={() => void alertsQuery.refetch()}
        />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<BellIcon className="size-7" />}
          title={t('alerts.empty.title')}
          description={t('alerts.empty.description')}
          action={<Button onClick={openCreate}>{t('alerts.newAlert')}</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              currentPriceUsd={prices[alert.coinId]?.usd ?? null}
              onEdit={() => openEdit(alert)}
            />
          ))}
        </ul>
      )}

      <AlertForm open={formOpen} onClose={closeForm} alert={editingAlert} />
    </>
  );
}
