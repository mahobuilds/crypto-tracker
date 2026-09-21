import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { ChartKind } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import {
  Button,
  EmptyState,
  ErrorMessage,
  ListRow,
  PageHeader,
  Panel,
  PnlText,
  Skeleton,
  StatCard,
} from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
import { TransactionForm } from '@/features/transactions';
import { WalletBreakdown, WalletForm, WalletSwitcher, useSelectedWallet } from '@/features/wallets';
import { formatMoneyUsd, formatPct, formatRelative, formatSignedMoneyUsd } from '@/lib/format';
import { AllocationChart } from './AllocationChart';
import { ChartSettingsButton } from './ChartSettingsButton';
import { PnlChart } from './PnlChart';
import { MethodLine, PnlMethods } from './PnlMethods';
import { usePortfolio } from './queries';

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Panel>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatCard.Skeleton className="col-span-2 lg:col-span-1" />
          <StatCard.Skeleton />
          <StatCard.Skeleton />
          <StatCard.Skeleton className="hidden lg:flex" />
        </div>
      </Panel>
      <Panel>
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-60 w-full md:h-72" />
      </Panel>
      <Panel flush>
        <ListRow.Skeleton rows={4} />
      </Panel>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const selected = useSelectedWallet();
  const portfolio = usePortfolio('whole', selected.walletId);
  const [addOpen, setAddOpen] = useState(false);
  const [walletFormOpen, setWalletFormOpen] = useState(false);
  const { language, baseCurrency, chartPrefs } = settings;

  // Wallet pills plus the "+" button; the form opens here so the user never leaves the page.
  const switcher = selected.isPending ? null : (
    <>
      <WalletSwitcher
        className="animate-rise"
        wallets={selected.wallets}
        value={selected.walletId}
        onChange={selected.setWalletId}
        onAdd={() => setWalletFormOpen(true)}
      />
      <WalletForm
        open={walletFormOpen}
        wallet={null}
        onClose={() => setWalletFormOpen(false)}
        onSaved={(wallet) => selected.setWalletId(wallet.id)}
      />
    </>
  );

  const pricesLine = portfolio.data?.pricesUpdatedAt
    ? t('dashboard.lastUpdated', {
        time: formatRelative(portfolio.data.pricesUpdatedAt, language),
      })
    : portfolio.data
      ? t('dashboard.pricesUnavailable')
      : undefined;
  const scopeLine = selected.hasMultiple
    ? (selected.wallet?.name ?? t('wallets.switcher.all'))
    : undefined;

  const header = (
    <PageHeader
      title={t('dashboard.title')}
      subtitle={[scopeLine, pricesLine].filter(Boolean).join(' · ') || undefined}
      actions={
        <>
          <Button variant="secondary" onClick={() => void navigate('/holdings')}>
            <Icon.Coins />
            {t('dashboard.holdingsLink')}
          </Button>
          <Button variant="secondary" onClick={() => void navigate('/wallets')}>
            <Icon.Wallet />
            {t('dashboard.walletsLink')}
          </Button>
          <ChartSettingsButton />
        </>
      }
    />
  );

  if (portfolio.isPending) {
    return (
      <>
        {header}
        {switcher}
        <DashboardSkeleton />
      </>
    );
  }

  if (portfolio.isError) {
    return (
      <>
        {header}
        {switcher}
        <ErrorMessage message={t('errors.generic')} onRetry={() => void portfolio.refetch()} />
      </>
    );
  }

  const summary = portfolio.data;
  const fx = summary.fx;
  const fifo = summary.methods.fifo;
  const isEmpty = summary.holdings.length === 0 && summary.investedUsd === 0;

  if (isEmpty) {
    return (
      <>
        {header}
        {switcher}
        <Panel className="animate-rise">
          <EmptyState
            icon={selected.wallet ? <Icon.Wallet /> : <Icon.Coins />}
            title={
              selected.wallet
                ? t('dashboard.emptyWallet.title', { name: selected.wallet.name })
                : t('dashboard.empty.title')
            }
            description={
              selected.wallet
                ? t('dashboard.emptyWallet.description')
                : t('dashboard.empty.description')
            }
            action={
              <Button onClick={() => setAddOpen(true)}>
                <Icon.Plus />
                {t('dashboard.empty.action')}
              </Button>
            }
          />
        </Panel>
        <TransactionForm
          open={addOpen}
          transaction={null}
          onClose={() => setAddOpen(false)}
          onSaved={() => setAddOpen(false)}
        />
      </>
    );
  }

  const unrealizedTone =
    summary.unrealizedPnlUsd > 0 ? 'gain' : summary.unrealizedPnlUsd < 0 ? 'loss' : 'default';
  const realizedTone =
    summary.realizedPnlUsd > 0 ? 'gain' : summary.realizedPnlUsd < 0 ? 'loss' : 'default';

  const charts = chartPrefs.order.filter((kind: ChartKind) =>
    kind === 'line' ? chartPrefs.lineChart : chartPrefs.pieChart,
  );

  const showBreakdown = selected.hasMultiple && selected.walletId === null;

  return (
    <>
      {header}
      {switcher}
      <Panel className="animate-rise" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <StatCard
            className="col-span-2 lg:col-span-1"
            emphasis
            label={t('dashboard.totalValue')}
            value={formatMoneyUsd(summary.totalValueUsd, baseCurrency, fx, language)}
            delta={
              <PnlText value={summary.unrealizedPnlUsd} iconSize={14}>
                {formatPct(summary.unrealizedPnlPct, language)}
              </PnlText>
            }
            hint={t('dashboard.allTime')}
          />
          <StatCard
            label={t('dashboard.unrealizedPnl')}
            tone={unrealizedTone}
            value={formatSignedMoneyUsd(summary.unrealizedPnlUsd, baseCurrency, fx, language)}
            delta={
              <PnlText value={summary.unrealizedPnlUsd} iconSize={14}>
                {formatPct(summary.unrealizedPnlPct, language)}
              </PnlText>
            }
            hint={t('dashboard.methodTag.average')}
            secondary={
              <MethodLine
                label={t('dashboard.methodTag.fifo')}
                value={fifo.unrealizedPnlUsd}
                pct={fifo.unrealizedPnlPct}
                currency={baseCurrency}
                fx={fx}
                language={language}
              />
            }
          />
          <StatCard
            label={t('dashboard.invested')}
            value={formatMoneyUsd(summary.investedUsd, baseCurrency, fx, language)}
            hint={t('dashboard.holdingsCount', { count: summary.holdings.length })}
          />
          <StatCard
            label={t('dashboard.realizedPnlLabel')}
            tone={realizedTone}
            value={formatSignedMoneyUsd(summary.realizedPnlUsd, baseCurrency, fx, language)}
            hint={t('dashboard.methodTag.average')}
            secondary={
              <MethodLine
                label={t('dashboard.methodTag.fifo')}
                value={fifo.realizedPnlUsd}
                pct={null}
                currency={baseCurrency}
                fx={fx}
                language={language}
              />
            }
          />
        </div>
      </Panel>

      {charts.map((kind, index) => (
        <div
          key={kind}
          className="animate-rise"
          style={{ '--i': index + 2 } as React.CSSProperties}
        >
          {kind === 'line' ? (
            <PnlChart walletId={selected.walletId} />
          ) : (
            <AllocationChart
              holdings={summary.holdings}
              currency={baseCurrency}
              fx={fx}
              language={language}
            />
          )}
        </div>
      ))}

      {showBreakdown ? (
        <div className="animate-rise" style={{ '--i': charts.length + 2 } as React.CSSProperties}>
          <WalletBreakdown
            currency={baseCurrency}
            fx={fx}
            language={language}
            onSelect={selected.setWalletId}
          />
        </div>
      ) : null}

      <div
        className="animate-rise"
        style={{ '--i': charts.length + (showBreakdown ? 3 : 2) } as React.CSSProperties}
      >
        <PnlMethods
          average={summary.methods.average}
          fifo={summary.methods.fifo}
          currency={baseCurrency}
          fx={fx}
          language={language}
        />
      </div>
    </>
  );
}
