import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { alertInputSchema } from '@crypto-tracker/shared';
import type { Alert, AlertDirection, CoinSearchResult } from '@crypto-tracker/shared';
import { CoinPicker } from '@/components/CoinPicker';
import {
  Button,
  Dialog,
  ErrorMessage,
  Field,
  Input,
  SegmentedControl,
  useToast,
} from '@/components/ui';
import { Icon } from '@/components/icons';
import { usePrices } from '@/hooks/usePrices';
import { ApiRequestError } from '@/lib/api';
import { useCreateAlert, useUpdateAlert } from './queries';

export interface AlertFormProps {
  open: boolean;
  onClose: () => void;
  alert?: Alert | null;
}

const QUICK_DELTA_PCT = 5;
const TARGET_PRICE_ID = 'alert-target-price';

function alertToCoin(alert: Alert): CoinSearchResult {
  return { id: alert.coinId, symbol: alert.coinSymbol, name: alert.coinName, thumb: null };
}

export function AlertForm({ open, onClose, alert }: AlertFormProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(alert);
  const toast = useToast();
  const createAlert = useCreateAlert();
  const updateAlert = useUpdateAlert();

  const [coin, setCoin] = useState<CoinSearchResult | null>(alert ? alertToCoin(alert) : null);
  const [direction, setDirection] = useState<AlertDirection>(alert?.direction ?? 'above');
  const [targetPrice, setTargetPrice] = useState(alert ? String(alert.targetPriceUsd) : '');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCoin(alert ? alertToCoin(alert) : null);
    setDirection(alert?.direction ?? 'above');
    setTargetPrice(alert ? String(alert.targetPriceUsd) : '');
    setPriceError(null);
    setFormError(null);
  }, [open, alert]);

  const priceCoinIds = coin ? [coin.id] : [];
  const { prices } = usePrices(priceCoinIds);
  const currentPriceUsd = coin ? (prices[coin.id]?.usd ?? null) : null;

  const isSaving = createAlert.isPending || updateAlert.isPending;

  function applyQuickFill(mode: 'current' | 'up' | 'down') {
    if (currentPriceUsd === null) return;
    if (mode === 'current') {
      setTargetPrice(String(currentPriceUsd));
      return;
    }
    const factor = mode === 'up' ? 1 + QUICK_DELTA_PCT / 100 : 1 - QUICK_DELTA_PCT / 100;
    setTargetPrice(String(currentPriceUsd * factor));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPriceError(null);

    if (!coin) {
      setFormError(t('alerts.form.coinRequired'));
      return;
    }

    const result = alertInputSchema.safeParse({
      coinId: coin.id,
      coinSymbol: coin.symbol,
      coinName: coin.name,
      targetPriceUsd: Number(targetPrice),
      direction,
      enabled: true,
    });
    if (!result.success) {
      setPriceError(result.error.issues[0]?.message ?? t('errors.generic'));
      return;
    }

    try {
      if (alert) {
        await updateAlert.mutateAsync({ id: alert.id, input: result.data });
      } else {
        await createAlert.mutateAsync(result.data);
      }
      toast.success(t(alert ? 'alerts.toast.updated' : 'alerts.toast.saved'));
      onClose();
    } catch (error) {
      setFormError(error instanceof ApiRequestError ? error.message : t('errors.generic'));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? t('alerts.form.editTitle') : t('alerts.form.createTitle')}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="alert-form"
            size="lg"
            loading={isSaving}
            trailingIcon={<Icon.Check size={16} weight="bold" />}
          >
            {t('alerts.form.save')}
          </Button>
        </>
      }
    >
      <form
        id="alert-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        {formError ? <ErrorMessage message={formError} /> : null}
        <CoinPicker value={coin} onChange={setCoin} label={t('alerts.form.coin')} />
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-ink-2">{t('alerts.form.direction')}</span>
          <SegmentedControl
            fullWidth
            label={t('alerts.form.direction')}
            value={direction}
            onChange={setDirection}
            options={[
              {
                value: 'above',
                label: t('alerts.form.goesAbove'),
                icon: <Icon.ArrowUpRight weight="bold" />,
                tone: 'gain',
              },
              {
                value: 'below',
                label: t('alerts.form.goesBelow'),
                icon: <Icon.ArrowDownRight weight="bold" />,
                tone: 'loss',
              },
            ]}
          />
        </div>
        <Field htmlFor={TARGET_PRICE_ID} label={t('alerts.form.targetPrice')} error={priceError}>
          <Input
            id={TARGET_PRICE_ID}
            inputMode="decimal"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            invalid={Boolean(priceError)}
          />
        </Field>
        {currentPriceUsd !== null ? (
          <div className="-mt-1 flex flex-wrap gap-2">
            {(['current', 'up', 'down'] as const).map((kind) => (
              <Button
                key={kind}
                type="button"
                variant="secondary"
                className="h-9 px-3.5 text-sm"
                onClick={() => applyQuickFill(kind)}
              >
                {t(
                  kind === 'current'
                    ? 'alerts.form.useCurrentPrice'
                    : kind === 'up'
                      ? 'alerts.form.plus5'
                      : 'alerts.form.minus5',
                )}
              </Button>
            ))}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
