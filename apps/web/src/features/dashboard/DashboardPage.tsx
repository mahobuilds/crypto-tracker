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
import { formatMoneyUsd, formatPct, formatRelative, formatSignedMoneyUsd } from '@/lib/format';
import { AllocationChart } from './AllocationChart';
import { ChartSettingsButton } from './ChartSettingsButton';
import { HoldingsTable } from './HoldingsTable';
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
  const portfolio = usePortfolio();
  const { language, baseCurrency, chartPrefs } = settings;

  const header = (
    <PageHeader
      title={t('dashboard.title')}
      subtitle={
        portfolio.data?.pricesUpdatedAt
          ? t('dashboard.lastUpdated', {
              time: formatRelative(portfolio.data.pricesUpdatedAt, language),
            })
          : portfolio.data
            ? t('dashboard.pricesUnavailable')
            : undefined
      }
      actions={<ChartSettingsButton />}
    />
  );

  if (portfolio.isPending) {
    return (
      <>
        {header}
        <DashboardSkeleton />
      </>
    );
  }

  if (portfolio.isError) {
    return (
      <>
        {header}
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
        <Panel className="animate-rise">
          <EmptyState
            icon={<Icon.Coins />}
            title={t('dashboard.empty.title')}
            description={t('dashboard.empty.description')}
            action={
              <Button onClick={() => void navigate('/transactions')}>
                <Icon.Plus />
                {t('dashboard.empty.action')}
              </Button>
            }
          />
        </Panel>
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

  return (
    <>
      {header}
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
            <PnlChart />
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

      <div className="animate-rise" style={{ '--i': charts.length + 2 } as React.CSSProperties}>
        <PnlMethods
          average={summary.methods.average}
          fifo={summary.methods.fifo}
          currency={baseCurrency}
          fx={fx}
          language={language}
        />
      </div>

      <div className="animate-rise" style={{ '--i': charts.length + 3 } as React.CSSProperties}>
        <HoldingsTable
          holdings={summary.holdings}
          currency={baseCurrency}
          fx={fx}
          language={language}
        />
      </div>
    </>
  );
}
