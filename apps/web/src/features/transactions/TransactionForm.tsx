import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  calculateFee,
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
  SegmentedControl,
  Select,
  Textarea,
  fieldErrorId,
  useToast,
} from '@/components/ui';
import { Icon } from '@/components/icons';
import type { SelectOption } from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
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
  datetime: string;
  note: string;
}

interface FieldErrors {
  coin?: string;
  quantity?: string;
  pricePerUnit?: string;
  currency?: string;
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
  const feePreview = hasTotalPreview ? calculateFee(quantityNum, priceNum) : 0;
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
      fee: calculateFee(Number(form.quantity), Number(form.pricePerUnit)),
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
      toast.success(t(transaction ? 'transactions.toast.updated' : 'transactions.toast.saved'));
      onSaved();
    } catch (cause) {
      setServerError(resolveTransactionError(cause, t));
    }
  }

  const toast = useToast();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={transaction ? t('transactions.form.editTitle') : t('transactions.form.addTitle')}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            form={formId}
            type="submit"
            size="lg"
            loading={isSaving}
            trailingIcon={<Icon.Check size={16} weight="bold" />}
          >
            {t('transactions.form.save')}
          </Button>
        </>
      }
    >
      {serverError ? <ErrorMessage message={serverError} className="mb-4" /> : null}
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4 pb-1">
        <SegmentedControl
          fullWidth
          label={t('transactions.form.type')}
          value={form.type}
          onChange={(type) => updateField('type', type)}
          options={[
            { value: 'buy', label: t('transactions.form.buy'), tone: 'gain' },
            { value: 'sell', label: t('transactions.form.sell'), tone: 'loss' },
          ]}
        />

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
              className="mt-1.5 flex items-center gap-1 text-sm font-medium text-loss"
            >
              <Icon.WarningCircle size={14} weight="fill" />
              {errors.coin}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            htmlFor={quantityId}
            label={t('transactions.form.quantity')}
            error={errors.quantity}
          >
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Field htmlFor={dateId} label={t('transactions.form.date')} error={errors.datetime}>
            <Input
              id={dateId}
              type="datetime-local"
              invalid={!!errors.datetime}
              value={form.datetime}
              onChange={(event) => updateField('datetime', event.target.value)}
            />
          </Field>
        </div>

        <Field
          htmlFor={noteId}
          label={t('transactions.form.note')}
          hint={t('common.optional')}
          error={errors.note}
        >
          <Textarea
            id={noteId}
            rows={2}
            invalid={!!errors.note}
            value={form.note}
            onChange={(event) => updateField('note', event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2 rounded-[var(--r-sm)] bg-surface-2 px-4 py-3 text-[0.9375rem] text-ink-2">
          <div className="flex items-center justify-between gap-3">
            <span>
              {hasTotalPreview
                ? `${form.quantity} ${form.coin?.symbol ?? ''} × ${formatFiat(priceNum, form.currency, settings.language)}`
                : t('transactions.form.total')}
            </span>
            <span className="tabular text-[1.125rem] font-semibold text-ink">
              {totalPreview ?? '-'}
            </span>
          </div>
          <div className="text-caption flex items-center justify-between gap-3 text-ink-3">
            <span>{t('transactions.form.feeAuto', { rate: '0.1%' })}</span>
            <span className="tabular">
              {hasTotalPreview ? formatFiat(feePreview, form.currency, settings.language) : '-'}
            </span>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
