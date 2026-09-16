import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Transaction, TransactionType } from '@crypto-tracker/shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { CoinIcon, PencilIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { useSettings } from '@/app/settings/SettingsProvider';
import { ApiRequestError } from '@/lib/api';
import { formatDate, formatFiat, formatQuantity } from '@/lib/format';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { TransactionForm } from './TransactionForm';
import type { TransactionsFilter } from './queries';
import { useTransactions } from './queries';
import { formatTransactionTotal } from './utils';

function buildCoinOptions(transactions: Transaction[], allLabel: string): SelectOption[] {
  const seen = new Map<string, string>();
  for (const tx of transactions) {
    if (!seen.has(tx.coinId)) {
      seen.set(tx.coinId, `${tx.coinSymbol} · ${tx.coinName}`);
    }
  }
  return [
    { value: '', label: allLabel },
    ...[...seen.entries()].map(([value, label]) => ({ value, label })),
  ];
}

interface FormDialogState {
  open: boolean;
  transaction: Transaction | null;
}

export function TransactionsPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [coinFilter, setCoinFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | TransactionType>('');
  const [formDialog, setFormDialog] = useState<FormDialogState>({ open: false, transaction: null });
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const filter: TransactionsFilter = useMemo(
    () => ({
      coinId: coinFilter || undefined,
      type: typeFilter || undefined,
    }),
    [coinFilter, typeFilter],
  );

  const listQuery = useTransactions(filter);
  const transactions = listQuery.data?.transactions ?? [];

  const allTransactionsQuery = useTransactions({});
  const coinOptions = buildCoinOptions(
    allTransactionsQuery.data?.transactions ?? [],
    t('transactions.filters.allCoins'),
  );
  const typeOptions: SelectOption[] = [
    { value: '', label: t('transactions.filters.allTypes') },
    { value: 'buy', label: t('transactions.type.buy') },
    { value: 'sell', label: t('transactions.type.sell') },
  ];

  function openAdd() {
    setFormDialog({ open: true, transaction: null });
  }

  function openEdit(tx: Transaction) {
    setFormDialog({ open: true, transaction: tx });
  }

  function closeForm() {
    setFormDialog((prev) => ({ ...prev, open: false }));
  }

  function errorMessage(error: unknown): string {
    if (error instanceof ApiRequestError && error.status === 0) return t('errors.network');
    return t('errors.generic');
  }

  return (
    <>
      <PageHeader
        title={t('transactions.title')}
        subtitle={t('transactions.subtitle')}
        actions={
          <Button size="lg" onClick={openAdd}>
            <PlusIcon className="size-5" />
            {t('transactions.add')}
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          aria-label={t('transactions.filters.coin')}
          options={coinOptions}
          value={coinFilter}
          onChange={(event) => setCoinFilter(event.target.value)}
        />
        <Select
          aria-label={t('transactions.filters.type')}
          options={typeOptions}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as '' | TransactionType)}
        />
      </div>

      {listQuery.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : listQuery.isError ? (
        <ErrorMessage
          message={errorMessage(listQuery.error)}
          onRetry={() => void listQuery.refetch()}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<CoinIcon className="size-7" />}
          title={t('transactions.empty.title')}
          description={t('transactions.empty.description')}
          action={
            <Button onClick={openAdd}>
              <PlusIcon className="size-5" />
              {t('transactions.empty.action')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-4 md:hidden">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold">
                      {tx.coinSymbol}{' '}
                      <span className="font-normal text-slate-600 dark:text-slate-400">
                        {tx.coinName}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(tx.occurredAt, settings.language)}
                    </p>
                  </div>
                  <Badge tone={tx.type === 'buy' ? 'positive' : 'negative'}>
                    {t(`transactions.type.${tx.type}`)}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t('transactions.list.quantity')}
                    </dt>
                    <dd className="font-medium">
                      {formatQuantity(tx.quantity, settings.language)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t('transactions.list.price')}
                    </dt>
                    <dd className="font-medium">
                      {formatFiat(tx.pricePerUnit, tx.currency, settings.language)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      {t('transactions.list.total')}
                    </dt>
                    <dd className="font-medium">
                      {formatTransactionTotal(
                        tx.quantity,
                        tx.pricePerUnit,
                        tx.currency,
                        settings.language,
                      )}
                    </dd>
                  </div>
                  {tx.fee > 0 ? (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">
                        {t('transactions.list.fee')}
                      </dt>
                      <dd className="font-medium">
                        {formatFiat(tx.fee, tx.currency, settings.language)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {tx.note ? (
                  <p
                    className="mt-2 truncate text-sm text-slate-600 dark:text-slate-400"
                    title={tx.note}
                  >
                    {tx.note}
                  </p>
                ) : null}
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(tx)}
                    aria-label={t('transactions.actions.edit')}
                    className="touch-target inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <PencilIcon className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingTx(tx)}
                    aria-label={t('transactions.actions.delete')}
                    className="touch-target inline-flex items-center justify-center rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block dark:border-slate-800">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-slate-50 text-start text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">
                    {t('transactions.list.date')}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t('transactions.list.coin')}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t('transactions.list.type')}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t('transactions.list.quantity')}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t('transactions.list.price')}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t('transactions.list.total')}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">{t('transactions.list.fee')}</th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t('transactions.list.note')}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    <span className="sr-only">{t('transactions.list.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(tx.occurredAt, settings.language)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{tx.coinSymbol}</span>{' '}
                      <span className="text-slate-600 dark:text-slate-400">{tx.coinName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tx.type === 'buy' ? 'positive' : 'negative'}>
                        {t(`transactions.type.${tx.type}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatQuantity(tx.quantity, settings.language)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatFiat(tx.pricePerUnit, tx.currency, settings.language)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {formatTransactionTotal(
                        tx.quantity,
                        tx.pricePerUnit,
                        tx.currency,
                        settings.language,
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tx.fee > 0 ? formatFiat(tx.fee, tx.currency, settings.language) : ''}
                    </td>
                    <td className="max-w-48 truncate px-4 py-3" title={tx.note ?? undefined}>
                      {tx.note ?? ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(tx)}
                          aria-label={t('transactions.actions.edit')}
                          className="touch-target inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <PencilIcon className="size-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTx(tx)}
                          aria-label={t('transactions.actions.delete')}
                          className="touch-target inline-flex items-center justify-center rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          <TrashIcon className="size-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <TransactionForm
        open={formDialog.open}
        transaction={formDialog.transaction}
        onClose={closeForm}
        onSaved={closeForm}
      />

      <DeleteTransactionDialog
        transaction={deletingTx}
        onClose={() => setDeletingTx(null)}
        onDeleted={() => setDeletingTx(null)}
      />
    </>
  );
}
