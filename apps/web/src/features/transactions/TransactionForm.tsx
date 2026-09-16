import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  transactionInputSchema,
  type Currency,
  type CoinSearchResult,
  type Transaction,
  type TransactionType,
} from '@crypto-tracker/shared';
import { CoinPicker } from '@/components/CoinPicker';
import {
  Button,
  Dialog,
  ErrorMessage,
  Field,
  Input,
  Select,
  Textarea,
  fieldErrorId,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
import { cn } from '@/lib/cn';
import { formatFiat } from '@/lib/format';
import { useCreateTransaction, useUpdateTransaction } from './queries';
import { fromDatetimeLocal, resolveTransactionError, toDatetimeLocal } from './utils';

export interface TransactionFormProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  type: TransactionType;
  coin: CoinSearchResult | null;
  quantity: string;
  pricePerUnit: string;
  currency: Currency;
  fee: string;
  datetime: string;
  note: string;
}

interface FieldErrors {
  coin?: string;
  quantity?: string;
  pricePerUnit?: string;
  currency?: string;
  fee?: string;
  datetime?: string;
  note?: string;
}

function buildInitialState(transaction: Transaction | null, baseCurrency: Currency): FormState {
  if (transaction) {
    return {
      type: transaction.type,
      coin: {
        id: transaction.coinId,
        symbol: transaction.coinSymbol,
        name: transaction.coinName,
        thumb: null,
      },
      quantity: String(transaction.quantity),
      pricePerUnit: String(transaction.pricePerUnit),
      currency: transaction.currency,
      fee: String(transaction.fee),
      datetime: toDatetimeLocal(transaction.occurredAt),
      note: transaction.note ?? '',
    };
  }
  return {
    type: 'buy',
    coin: null,
    quantity: '',
    pricePerUnit: '',
    currency: baseCurrency,
    fee: '0',
    datetime: toDatetimeLocal(new Date().toISOString()),
    note: '',
  };
}

export function TransactionForm({ open, transaction, onClose, onSaved }: TransactionFormProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(transaction, settings.baseCurrency),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialState(transaction, settings.baseCurrency));
    setErrors({});
    setServerError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction]);

  const formId = 'transaction-form';
  const coinFieldId = 'transaction-form-coin';
  const quantityId = 'transaction-form-quantity';
  const priceId = 'transaction-form-price';
  const currencyId = 'transaction-form-currency';
  const feeId = 'transaction-form-fee';
  const dateId = 'transaction-form-date';
  const noteId = 'transaction-form-note';

  const currencyOptions: SelectOption[] = CURRENCIES.map((currency) => ({
    value: currency,
    label: `${currency} (${CURRENCY_SYMBOLS[currency]})`,
  }));

  const quantityNum = Number(form.quantity);
  const priceNum = Number(form.pricePerUnit);
  const hasTotalPreview =
    form.quantity.trim() !== '' &&
    form.pricePerUnit.trim() !== '' &&
    Number.isFinite(quantityNum) &&
    Number.isFinite(priceNum);
  const totalPreview = hasTotalPreview
    ? formatFiat(quantityNum * priceNum, form.currency, settings.language)
    : null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const raw = {
      type: form.type,
      coinId: form.coin?.id ?? '',
      coinSymbol: form.coin?.symbol ?? '',
      coinName: form.coin?.name ?? '',
      quantity: Number(form.quantity),
      pricePerUnit: Number(form.pricePerUnit),
      currency: form.currency,
      fee: form.fee.trim() === '' ? 0 : Number(form.fee),
      occurredAt: fromDatetimeLocal(form.datetime),
      note: form.note.trim() === '' ? null : form.note.trim(),
    };

    const result = transactionInputSchema.safeParse(raw);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors({
        coin:
          flat.coinId || flat.coinSymbol || flat.coinName
            ? t('transactions.form.errors.coin')
            : undefined,
        quantity: flat.quantity ? t('transactions.form.errors.quantity') : undefined,
        pricePerUnit: flat.pricePerUnit ? t('transactions.form.errors.pricePerUnit') : undefined,
        currency: flat.currency ? t('transactions.form.errors.currency') : undefined,
        fee: flat.fee ? t('transactions.form.errors.fee') : undefined,
        datetime: flat.occurredAt ? t('transactions.form.errors.date') : undefined,
        note: flat.note ? t('transactions.form.errors.note') : undefined,
      });
      return;
    }

    setErrors({});
    try {
      if (transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, input: result.data });
      } else {
        await createMutation.mutateAsync(result.data);
      }
      onSaved();
    } catch (cause) {
      setServerError(resolveTransactionError(cause, t));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={transaction ? t('transactions.form.editTitle') : t('transactions.form.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button form={formId} type="submit" loading={isSaving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      {serverError ? <ErrorMessage message={serverError} className="mb-4" /> : null}
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-base font-medium text-slate-800 dark:text-slate-200">
            {t('transactions.form.type')}
          </span>
          <div
            className="grid grid-cols-2 gap-3"
            role="radiogroup"
            aria-label={t('transactions.form.type')}
          >
            <button
              type="button"
              role="radio"
              aria-checked={form.type === 'buy'}
              onClick={() => updateField('type', 'buy')}
              className={cn(
                'touch-target rounded-xl border-2 px-4 py-3 text-lg font-semibold transition-colors',
                form.type === 'buy'
                  ? 'border-green-600 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-950 dark:text-green-300'
                  : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
              )}
            >
              {t('transactions.form.buy')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={form.type === 'sell'}
              onClick={() => updateField('type', 'sell')}
              className={cn(
                'touch-target rounded-xl border-2 px-4 py-3 text-lg font-semibold transition-colors',
                form.type === 'sell'
                  ? 'border-red-600 bg-red-50 text-red-800 dark:border-red-500 dark:bg-red-950 dark:text-red-300'
                  : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
              )}
            >
              {t('transactions.form.sell')}
            </button>
          </div>
        </div>

        <div>
          <CoinPicker
            value={form.coin}
            onChange={(coin) => updateField('coin', coin)}
            label={t('transactions.form.coinLabel')}
          />
          {errors.coin ? (
            <p
              id={fieldErrorId(coinFieldId)}
              role="alert"
              className="mt-1.5 text-sm font-medium text-red-700 dark:text-red-400"
            >
              {errors.coin}
            </p>
          ) : null}
        </div>

        <Field htmlFor={quantityId} label={t('transactions.form.quantity')} error={errors.quantity}>
          <Input
            id={quantityId}
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            invalid={!!errors.quantity}
            value={form.quantity}
            onChange={(event) => updateField('quantity', event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            htmlFor={priceId}
            label={t('transactions.form.pricePerUnit')}
            error={errors.pricePerUnit}
          >
            <Input
              id={priceId}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              invalid={!!errors.pricePerUnit}
              value={form.pricePerUnit}
              onChange={(event) => updateField('pricePerUnit', event.target.value)}
            />
          </Field>

          <Field
            htmlFor={currencyId}
            label={t('transactions.form.currency')}
            error={errors.currency}
          >
            <Select
              id={currencyId}
              options={currencyOptions}
              invalid={!!errors.currency}
              value={form.currency}
              onChange={(event) => updateField('currency', event.target.value as Currency)}
            />
          </Field>
        </div>

        <p className="text-base text-slate-700 dark:text-slate-300">
          {t('transactions.form.total')}:{' '}
          <span className="font-semibold">{totalPreview ?? '—'}</span>
        </p>

        <Field
          htmlFor={feeId}
          label={t('transactions.form.fee')}
          hint={t('common.optional')}
          error={errors.fee}
        >
          <Input
            id={feeId}
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            invalid={!!errors.fee}
            value={form.fee}
            onChange={(event) => updateField('fee', event.target.value)}
          />
        </Field>

        <Field htmlFor={dateId} label={t('transactions.form.date')} error={errors.datetime}>
          <Input
            id={dateId}
            type="datetime-local"
            invalid={!!errors.datetime}
            value={form.datetime}
            onChange={(event) => updateField('datetime', event.target.value)}
          />
        </Field>

        <Field
          htmlFor={noteId}
          label={t('transactions.form.note')}
          hint={t('common.optional')}
          error={errors.note}
        >
          <Textarea
            id={noteId}
            invalid={!!errors.note}
            value={form.note}
            onChange={(event) => updateField('note', event.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  );
}
