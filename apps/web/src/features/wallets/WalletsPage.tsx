import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { MAX_WALLETS_PER_USER } from '@crypto-tracker/shared';
import type { Wallet, WalletValuation } from '@crypto-tracker/shared';
import { useSettings } from '@/app/settings/SettingsProvider';
import { Icon } from '@/components/icons';
import {
  Button,
  Dialog,
  ErrorMessage,
  IconButton,
  ListGroup,
  ListRow,
  PageHeader,
  Panel,
  PnlText,
  useToast,
} from '@/components/ui';
import { useWalletBreakdown } from '@/features/dashboard/queries';
import { formatMoneyUsd, formatPct } from '@/lib/format';
import { WalletForm, resolveWalletError } from './WalletForm';
import { useDeleteWallet, useWallets } from './queries';
import { useSelectedWallet } from './useSelectedWallet';

interface FormState {
  open: boolean;
  wallet: Wallet | null;
}

export function WalletsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();
  const { language, baseCurrency } = settings;
  const walletsQuery = useWallets();
  const breakdown = useWalletBreakdown();
  const deleteWallet = useDeleteWallet();
  const { walletId: selectedId, setWalletId } = useSelectedWallet();

  const [form, setForm] = useState<FormState>({ open: false, wallet: null });
  const [actionsFor, setActionsFor] = useState<Wallet | null>(null);
  const [deleting, setDeleting] = useState<Wallet | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const wallets = walletsQuery.data?.wallets ?? [];
  const valuations = new Map<string, WalletValuation>(
    (breakdown.data?.wallets ?? []).map((w) => [w.walletId, w]),
  );
  const fx = breakdown.data?.fx;
  const atLimit = wallets.length >= MAX_WALLETS_PER_USER;

  function openCreate() {
    setForm({ open: true, wallet: null });
  }
  function openRename(wallet: Wallet) {
    setActionsFor(null);
    setForm({ open: true, wallet });
  }
  function openDelete(wallet: Wallet) {
    setActionsFor(null);
    setDeleteError(null);
    setDeleting(wallet);
  }
  function viewOnDashboard(wallet: Wallet) {
    setActionsFor(null);
    setWalletId(wallet.id);
    void navigate('/');
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteWallet.mutateAsync(deleting.id);
      if (selectedId === deleting.id) setWalletId(null);
      setDeleting(null);
      toast.success(t('wallets.toast.deleted'));
    } catch (cause) {
      setDeleteError(resolveWalletError(cause, t));
    }
  }

  const rowActions = (wallet: Wallet) => (
    <>
      <div className="hidden md:flex">
        <IconButton aria-label={t('wallets.actions.rename')} onClick={() => openRename(wallet)}>
          <Icon.Pencil />
        </IconButton>
        <IconButton
          variant="danger"
          aria-label={t('wallets.actions.delete')}
          onClick={() => openDelete(wallet)}
        >
          <Icon.Trash />
        </IconButton>
      </div>
      <IconButton
        className="md:hidden"
        aria-label={t('wallets.actions.more')}
        onClick={() => setActionsFor(wallet)}
      >
        <Icon.DotsThree weight="bold" />
      </IconButton>
    </>
  );

  function subtitle(wallet: Wallet): string {
    const value = valuations.get(wallet.id);
    const parts = [t('wallets.list.transactions', { count: wallet.transactionCount })];
    if (value) parts.push(t('wallets.list.holdings', { count: value.holdingsCount }));
    return parts.join(' · ');
  }

  return (
    <>
      <PageHeader
        title={t('wallets.title')}
        subtitle={t('wallets.subtitle')}
        actions={
          <Button onClick={openCreate} disabled={atLimit}>
            <Icon.Plus weight="bold" />
            {t('wallets.add')}
          </Button>
        }
      />

      <Panel flush className="animate-rise" style={{ '--i': 1 } as React.CSSProperties}>
        {walletsQuery.isPending ? (
          <ListRow.Skeleton rows={3} />
        ) : walletsQuery.isError ? (
          <div className="p-5">
            <ErrorMessage
              message={t('errors.generic')}
              onRetry={() => void walletsQuery.refetch()}
            />
          </div>
        ) : (
          <ListGroup className="pb-2">
            {wallets.map((wallet) => {
              const value = valuations.get(wallet.id);
              return (
                <ListRow
                  key={wallet.id}
                  className="border-0"
                  onPress={() => viewOnDashboard(wallet)}
                  leading={
                    <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon.Wallet />
                    </span>
                  }
                  title={wallet.name}
                  subtitle={subtitle(wallet)}
                  trailing={
                    value && fx
                      ? formatMoneyUsd(value.totalValueUsd, baseCurrency, fx, language)
                      : undefined
                  }
                  trailingSub={
                    value && value.investedUsd > 0 ? (
                      <PnlText value={value.unrealizedPnlUsd} iconSize={12}>
                        {formatPct(value.unrealizedPnlPct, language)}
                      </PnlText>
                    ) : undefined
                  }
                  actions={rowActions(wallet)}
                />
              );
            })}
          </ListGroup>
        )}
      </Panel>

      <p className="text-caption px-1 text-ink-3">
        {t('wallets.hint', { max: MAX_WALLETS_PER_USER })}
      </p>

      <Dialog
        open={actionsFor !== null}
        onClose={() => setActionsFor(null)}
        title={actionsFor?.name ?? ''}
      >
        <div className="flex flex-col gap-2 pb-2">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => actionsFor && viewOnDashboard(actionsFor)}
          >
            <Icon.Home />
            {t('wallets.actions.view')}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => actionsFor && openRename(actionsFor)}
          >
            <Icon.Pencil />
            {t('wallets.actions.rename')}
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

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('wallets.delete.title')}
        presentation="center"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={deleteWallet.isPending}
              disabled={(deleting?.transactionCount ?? 0) > 0}
              onClick={() => void handleDelete()}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        {deleteError ? <ErrorMessage message={deleteError} className="mb-4" /> : null}
        <p className="text-base text-ink-2">
          {deleting
            ? deleting.transactionCount > 0
              ? t('wallets.delete.notEmpty', {
                  name: deleting.name,
                  count: deleting.transactionCount,
                })
              : t('wallets.delete.confirm', { name: deleting.name })
            : null}
        </p>
      </Dialog>

      <WalletForm
        open={form.open}
        wallet={form.wallet}
        onClose={() => setForm((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
