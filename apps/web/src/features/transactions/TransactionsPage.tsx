import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LANGUAGE_LOCALE } from '@crypto-tracker/shared';
import type { Transaction, TransactionType } from '@crypto-tracker/shared';
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
  Select,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useSettings } from '@/app/settings/SettingsProvider';
import { ApiRequestError } from '@/lib/api';
import { formatDate, formatFiat, formatQuantity } from '@/lib/format';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { TransactionForm } from './TransactionForm';
import type { TransactionsFilter } from './queries';
import { useTransactions } from './queries';
import { formatParticipants, formatTransactionTotal } from './utils';

function buildCoinOptions(transactions: Transaction[], allLabel: string): SelectOption[] {
  const seen = new Map<string, string>();
  for (const tx of transactions) {
    if (!seen.has(tx.coinId)) seen.set(tx.coinId, `${tx.coinSymbol} · ${tx.coinName}`);
  }
  return [
    { value: '', label: allLabel },
    ...[...seen.entries()].map(([value, label]) => ({ value, label })),
  ];
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

interface FormDialogState {
  open: boolean;
  transaction: Transaction | null;
}

export function TransactionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { language } = settings;

  const [coinFilter, setCoinFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | TransactionType>('');
  const [formDialog, setFormDialog] = useState<FormDialogState>({ open: false, transaction: null });
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [actionsFor, setActionsFor] = useState<Transaction | null>(null);

  const filter: TransactionsFilter = useMemo(
    () => ({ coinId: coinFilter || undefined, type: typeFilter || undefined }),
    [coinFilter, typeFilter],
  );

  const listQuery = useTransactions(filter);
  const transactions = listQuery.data?.transactions ?? [];
  const allTransactionsQuery = useTransactions({});
  const allCount = allTransactionsQuery.data?.transactions.length;

  const coinOptions = buildCoinOptions(
    allTransactionsQuery.data?.transactions ?? [],
    t('transactions.filters.allCoins'),
  );
  const typeOptions: SelectOption[] = [
    { value: '', label: t('transactions.filters.allTypes') },
    { value: 'buy', label: t('transactions.type.buy') },
    { value: 'sell', label: t('transactions.type.sell') },
  ];

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const key = monthKey(tx.occurredAt);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [transactions]);

  const monthLabel = (key: string) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleDateString(LANGUAGE_LOCALE[language], {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  function openAdd() {
    setFormDialog({ open: true, transaction: null });
  }
  function openEdit(tx: Transaction) {
    setActionsFor(null);
    setFormDialog({ open: true, transaction: tx });
  }
  function openDelete(tx: Transaction) {
    setActionsFor(null);
    setDeletingTx(tx);
  }
  function closeForm() {
    setFormDialog((prev) => ({ ...prev, open: false }));
  }
  function errorMessage(error: unknown): string {
    if (error instanceof ApiRequestError && error.status === 0) return t('errors.network');
    return t('errors.generic');
  }

  const rowActions = (tx: Transaction) => (
    <>
      <div className="hidden md:flex">
        <IconButton aria-label={t('transactions.actions.edit')} onClick={() => openEdit(tx)}>
          <Icon.Pencil />
        </IconButton>
        <IconButton
          variant="danger"
          aria-label={t('transactions.actions.delete')}
          onClick={() => openDelete(tx)}
        >
          <Icon.Trash />
        </IconButton>
      </div>
      <IconButton
        className="md:hidden"
        aria-label={t('transactions.actions.more')}
        onClick={() => setActionsFor(tx)}
      >
        <Icon.DotsThree weight="bold" />
      </IconButton>
    </>
  );

  return (
    <>
      <PageHeader
        title={t('transactions.title')}
        subtitle={allCount === undefined ? undefined : t('transactions.count', { count: allCount })}
        actions={
          <>
            <Button variant="secondary" onClick={() => void navigate('/import')}>
              <Icon.FileCsv />
              {t('transactions.import')}
            </Button>
            <Button onClick={openAdd}>
              <Icon.Plus weight="bold" />
              {t('transactions.add')}
            </Button>
          </>
        }
      />

      <div
        className="animate-rise grid grid-cols-2 gap-3"
        style={{ '--i': 1 } as React.CSSProperties}
      >
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

      <Panel flush className="animate-rise" style={{ '--i': 2 } as React.CSSProperties}>
        {listQuery.isPending ? (
          <ListRow.Skeleton rows={6} />
        ) : listQuery.isError ? (
          <div className="p-5">
            <ErrorMessage
              message={errorMessage(listQuery.error)}
              onRetry={() => void listQuery.refetch()}
            />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Icon.Coins />}
            title={t('transactions.empty.title')}
            description={t('transactions.empty.description')}
            action={
              <Button onClick={openAdd}>
                <Icon.Plus weight="bold" />
                {t('transactions.empty.action')}
              </Button>
            }
          />
        ) : (
          <ListGroup className="pb-2">
            {groups.map(([key, items]) => (
              <Fragment key={key}>
                <ListLabel className="border-0">{monthLabel(key)}</ListLabel>
                {items.map((tx) => (
                  <ListRow
                    key={tx.id}
                    className="border-0"
                    multiline={tx.scope === 'group'}
                    leading={<Avatar label={tx.coinSymbol} />}
                    title={tx.coinSymbol}
                    titleAside={
                      <>
                        <Badge tone={tx.type === 'buy' ? 'gain' : 'loss'}>
                          {t(`transactions.type.${tx.type}`)}
                        </Badge>
                        {tx.scope === 'group' ? (
                          <Badge tone="accent" icon={<Icon.UsersThree weight="bold" />}>
                            {t('transactions.scope.group')}
                          </Badge>
                        ) : null}
                      </>
                    }
                    subtitle={
                      <>
                        <span className="block truncate">
                          {`${formatDate(tx.occurredAt, language)} · ${formatQuantity(tx.quantity, language)} ${tx.coinSymbol} ${t('transactions.at')} ${formatFiat(tx.pricePerUnit, tx.currency, language)}` +
                            (tx.fee > 0
                              ? ` · ${t('transactions.list.fee')} ${formatFiat(tx.fee, tx.currency, language)}`
                              : '')}
                        </span>
                        {tx.scope === 'group' ? (
                          <span className="block">
                            <Icon.UsersThree />{' '}
                            {formatParticipants(tx.participants, language, t('transactions.you'))}
                          </span>
                        ) : null}
                      </>
                    }
                    trailing={formatTransactionTotal(
                      tx.quantity,
                      tx.pricePerUnit,
                      tx.currency,
                      language,
                    )}
                    trailingSub={tx.note ?? undefined}
                    actions={rowActions(tx)}
                  />
                ))}
              </Fragment>
            ))}
          </ListGroup>
        )}
      </Panel>

      <Dialog
        open={actionsFor !== null}
        onClose={() => setActionsFor(null)}
        title={
          actionsFor
            ? `${actionsFor.coinSymbol} · ${formatDate(actionsFor.occurredAt, language)}`
            : ''
        }
      >
        <div className="flex flex-col gap-2 pb-2">
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
            onClick={() => actionsFor && openDelete(actionsFor)}
          >
            <Icon.Trash />
            {t('common.delete')}
          </Button>
        </div>
      </Dialog>

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
