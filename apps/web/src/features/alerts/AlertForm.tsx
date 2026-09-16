import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { alertInputSchema } from '@crypto-tracker/shared';
import type { Alert, AlertDirection, CoinSearchResult } from '@crypto-tracker/shared';
import { CoinPicker } from '@/components/CoinPicker';
import { Button, Dialog, ErrorMessage, Field, Input } from '@/components/ui';
import { usePrices } from '@/hooks/usePrices';
import { ApiRequestError } from '@/lib/api';
import { cn } from '@/lib/cn';
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

interface DirectionOptionProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function DirectionOption({ active, onClick, children }: DirectionOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'touch-target rounded-xl border px-4 py-2.5 text-base font-semibold transition-colors',
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  );
}

export function AlertForm({ open, onClose, alert }: AlertFormProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(alert);
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
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="alert-form" loading={isSaving}>
            {t('common.save')}
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
          <span className="text-base font-medium text-slate-800 dark:text-slate-200">
            {t('alerts.form.direction')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <DirectionOption active={direction === 'above'} onClick={() => setDirection('above')}>
              {t('alerts.form.goesAbove')}
            </DirectionOption>
            <DirectionOption active={direction === 'below'} onClick={() => setDirection('below')}>
              {t('alerts.form.goesBelow')}
            </DirectionOption>
          </div>
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => applyQuickFill('current')}>
              {t('alerts.form.useCurrentPrice')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => applyQuickFill('up')}>
              {t('alerts.form.plus5')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => applyQuickFill('down')}>
              {t('alerts.form.minus5')}
            </Button>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
