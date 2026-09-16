import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Alert } from '@crypto-tracker/shared';
import { useSettings } from '@/app/settings/SettingsProvider';
import { Icon } from '@/components/icons';
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorMessage,
  IconButton,
  ListGroup,
  ListLabel,
  ListRow,
  PageHeader,
  Panel,
  useToast,
} from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { useFx } from '@/hooks/useFx';
import { usePrices } from '@/hooks/usePrices';
import { ApiRequestError } from '@/lib/api';
import { formatDateTime, formatFiat, formatMoneyUsd, formatPct } from '@/lib/format';
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

const STATUS_TONE: Record<AlertStatus, BadgeTone> = {
  active: 'accent',
  paused: 'neutral',
  triggered: 'warn',
};
const PUSH_TONE: Record<PushStatus, BadgeTone> = {
  unsupported: 'neutral',
  blocked: 'warn',
  off: 'neutral',
  on: 'gain',
};

function alertStatus(alert: Alert): AlertStatus {
  if (alert.triggeredAt) return 'triggered';
  return alert.enabled ? 'active' : 'paused';
}

function usePushStatus() {
  const [status, setStatus] = useState<PushStatus>('unsupported');
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) return setStatus('unsupported');
    if (getPushPermission() === 'denied') return setStatus('blocked');
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
        if (result === 'denied') return setStatus('blocked');
      }
      await refresh();
    } finally {
      setIsBusy(false);
    }
  }, [status, refresh]);

  return { status, isBusy, toggle };
}

export function AlertsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { settings, updateSettings } = useSettings();
  const { language, baseCurrency } = settings;
  const { fx } = useFx();
  const alertsQuery = useAlerts();
  const pushStatus = usePushStatus();
  const deleteAlert = useDeleteAlert();
  const updateAlert = useUpdateAlert();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [actionsFor, setActionsFor] = useState<Alert | null>(null);
  const [deleting, setDeleting] = useState<Alert | null>(null);

  const alerts = alertsQuery.data?.alerts ?? [];
  const groups = useMemo(() => {
    const active = alerts.filter((a) => alertStatus(a) === 'active');
    const paused = alerts.filter((a) => alertStatus(a) === 'paused');
    const triggered = alerts.filter((a) => alertStatus(a) === 'triggered');
    return [
      ['active', active],
      ['paused', paused],
      ['triggered', triggered],
    ] as const;
  }, [alerts]);

  const coinIds = useMemo(() => Array.from(new Set(alerts.map((a) => a.coinId))), [alerts]);
  const { prices } = usePrices(coinIds);

  function openCreate() {
    setEditingAlert(null);
    setFormOpen(true);
  }
  function openEdit(alert: Alert) {
    setActionsFor(null);
    setEditingAlert(alert);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditingAlert(null);
  }

  async function handleRearm(alert: Alert) {
    setActionsFor(null);
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
    toast.success(t('alerts.toast.rearmed'));
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteAlert.mutateAsync(deleting.id);
    setDeleting(null);
    toast.success(t('alerts.toast.deleted'));
  }

  function conditionText(alert: Alert) {
    const symbol = alert.direction === 'above' ? '≥' : '≤';
    return `${alert.coinSymbol} ${symbol} ${formatFiat(alert.targetPriceUsd, 'USD', language)}`;
  }

  function subtitleText(alert: Alert) {
    const current = prices[alert.coinId]?.usd ?? null;
    const parts: string[] = [];
    if (current !== null) {
      const distance = ((alert.targetPriceUsd - current) / current) * 100;
      parts.push(
        `${t('alerts.list.now')} ${formatFiat(current, 'USD', language)} · ${t('alerts.list.away', { pct: formatPct(Math.abs(distance), language, { signed: false }) })}`,
      );
    } else if (fx && baseCurrency !== 'USD') {
      parts.push(`≈ ${formatMoneyUsd(alert.targetPriceUsd, baseCurrency, fx, language)}`);
    }
    if (alert.triggeredAt) {
      parts.length = 0;
      parts.push(
        t('alerts.list.triggeredAt', { date: formatDateTime(alert.triggeredAt, language) }),
      );
    }
    return parts.join(' · ');
  }

  const rowActions = (alert: Alert) => {
    const status = alertStatus(alert);
    return (
      <>
        <div className="hidden items-center gap-1 md:flex">
          {status !== 'active' ? (
            <Button
              variant="secondary"
              size="md"
              className="h-9 px-3 text-sm"
              onClick={() => void handleRearm(alert)}
              loading={updateAlert.isPending && updateAlert.variables?.id === alert.id}
            >
              {t('alerts.actions.rearm')}
            </Button>
          ) : null}
          <IconButton aria-label={t('common.edit')} onClick={() => openEdit(alert)}>
            <Icon.Pencil />
          </IconButton>
          <IconButton
            variant="danger"
            aria-label={t('common.delete')}
            onClick={() => setDeleting(alert)}
          >
            <Icon.Trash />
          </IconButton>
        </div>
        <IconButton
          className="md:hidden"
          aria-label={t('alerts.actions.more')}
          onClick={() => setActionsFor(alert)}
        >
          <Icon.DotsThree weight="bold" />
        </IconButton>
      </>
    );
  };

  return (
    <>
      <PageHeader
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle')}
        actions={
          settings.alertsEnabled ? (
            <Button onClick={openCreate}>
              <Icon.Plus weight="bold" />
              {t('alerts.newAlert')}
            </Button>
          ) : undefined
        }
      />

      {!settings.alertsEnabled ? (
        <Panel tone="accent" className="animate-rise">
          <EmptyState
            icon={<Icon.BellRinging />}
            title={t('alerts.offCard.title')}
            description={t('alerts.offCard.description')}
            action={
              <Button onClick={() => void updateSettings({ alertsEnabled: true })}>
                {t('alerts.offCard.enable')}
              </Button>
            }
          />
        </Panel>
      ) : (
        <>
          <Panel flush className="animate-rise" style={{ '--i': 1 } as React.CSSProperties}>
            <ListRow
              leading={
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon.BellRinging />
                </span>
              }
              title={t('alerts.notifications.title')}
              titleAside={
                <Badge tone={PUSH_TONE[pushStatus.status]}>
                  {t(`alerts.notifications.badge.${pushStatus.status}`)}
                </Badge>
              }
              subtitle={t(`alerts.notifications.status.${pushStatus.status}`)}
              actions={
                pushStatus.status === 'unsupported' ||
                pushStatus.status === 'blocked' ? undefined : (
                  <Button
                    variant="secondary"
                    className="h-10 px-4 text-sm"
                    onClick={() => void pushStatus.toggle()}
                    loading={pushStatus.isBusy}
                  >
                    {pushStatus.status === 'on'
                      ? t('alerts.notifications.disable')
                      : t('alerts.notifications.enable')}
                  </Button>
                )
              }
            />
          </Panel>

          <Panel flush className="animate-rise" style={{ '--i': 2 } as React.CSSProperties}>
            {alertsQuery.isPending ? (
              <ListRow.Skeleton rows={3} />
            ) : alertsQuery.isError ? (
              <div className="p-5">
                <ErrorMessage
                  message={
                    alertsQuery.error instanceof ApiRequestError
                      ? alertsQuery.error.message
                      : t('errors.generic')
                  }
                  onRetry={() => void alertsQuery.refetch()}
                />
              </div>
            ) : alerts.length === 0 ? (
              <EmptyState
                icon={<Icon.Bell />}
                title={t('alerts.empty.title')}
                description={t('alerts.empty.description')}
                action={
                  <Button onClick={openCreate}>
                    <Icon.Plus weight="bold" />
                    {t('alerts.newAlert')}
                  </Button>
                }
              />
            ) : (
              <ListGroup className="pb-2">
                {groups.map(([status, items]) =>
                  items.length === 0 ? null : (
                    <Fragment key={status}>
                      <ListLabel className="border-0">{t(`alerts.list.${status}`)}</ListLabel>
                      {items.map((alert) => (
                        <ListRow
                          key={alert.id}
                          className="border-0"
                          leading={<Avatar label={alert.coinSymbol} />}
                          title={<span className="tabular">{conditionText(alert)}</span>}
                          titleAside={
                            <Badge tone={STATUS_TONE[alertStatus(alert)]}>
                              {t(`alerts.list.${alertStatus(alert)}`)}
                            </Badge>
                          }
                          subtitle={subtitleText(alert)}
                          actions={rowActions(alert)}
                        />
                      ))}
                    </Fragment>
                  ),
                )}
              </ListGroup>
            )}
          </Panel>
        </>
      )}

      <Dialog
        open={actionsFor !== null}
        onClose={() => setActionsFor(null)}
        title={actionsFor ? conditionText(actionsFor) : ''}
      >
        <div className="flex flex-col gap-2 pb-2">
          {actionsFor && alertStatus(actionsFor) !== 'active' ? (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => actionsFor && void handleRearm(actionsFor)}
            >
              <Icon.ArrowsClockwise />
              {t('alerts.actions.rearm')}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => actionsFor && openEdit(actionsFor)}
          >
            <Icon.Pencil />
            {t('common.edit')}
          </Button>
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={() => {
              if (actionsFor) setDeleting(actionsFor);
              setActionsFor(null);
            }}
          >
            <Icon.Trash />
            {t('common.delete')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('alerts.actions.deleteTitle')}
        presentation="center"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
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
        <p className="text-base text-ink-2">
          {deleting ? t('alerts.actions.confirmDelete', { coin: conditionText(deleting) }) : null}
        </p>
      </Dialog>

      <AlertForm open={formOpen} onClose={closeForm} alert={editingAlert} />
    </>
  );
}
