import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ChartKind } from '@crypto-tracker/shared';
import { ChartIcon } from '@/components/icons';
import { EmptyState, ErrorMessage, PageHeader, PnlText, Spinner } from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
import { formatMoneyUsd, formatPct, formatRelative } from '@/lib/format';
import { AllocationChart } from './AllocationChart';
import { ChartSettingsButton } from './ChartSettingsButton';
import { HoldingsTable } from './HoldingsTable';
import { StatCard } from './StatCard';
import { ValueChart } from './ValueChart';
import { usePortfolio } from './queries';

export function DashboardPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const portfolio = usePortfolio();

  if (portfolio.isPending) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (portfolio.isError) {
    return <ErrorMessage message={t('errors.generic')} onRetry={() => void portfolio.refetch()} />;
  }

  const summary = portfolio.data;
  const { language, baseCurrency, chartPrefs } = settings;
  const isEmpty = summary.holdings.length === 0 && summary.investedUsd === 0;

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={
          summary.pricesUpdatedAt
            ? t('dashboard.lastUpdated', {
                time: formatRelative(summary.pricesUpdatedAt, language),
              })
            : t('dashboard.pricesUnavailable')
        }
        actions={<ChartSettingsButton />}
      />

      {isEmpty ? (
        <EmptyState
          icon={<ChartIcon className="size-7" />}
          title={t('dashboard.empty.title')}
          description={t('dashboard.empty.description')}
          action={
            <Link
              to="/transactions"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800"
            >
              {t('dashboard.empty.action')}
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              label={t('dashboard.totalValue')}
              value={formatMoneyUsd(summary.totalValueUsd, baseCurrency, summary.fx, language)}
            />
            <StatCard
              label={t('dashboard.invested')}
              value={formatMoneyUsd(summary.investedUsd, baseCurrency, summary.fx, language)}
            />
            <StatCard
              label={t('dashboard.unrealizedPnl')}
              value={
                <PnlText value={summary.unrealizedPnlUsd}>
                  {formatMoneyUsd(summary.unrealizedPnlUsd, baseCurrency, summary.fx, language)}
                </PnlText>
              }
              secondary={
                <PnlText value={summary.unrealizedPnlUsd}>
                  {formatPct(summary.unrealizedPnlPct, language)}
                </PnlText>
              }
            />
          </div>

          <p className="text-base text-slate-600 dark:text-slate-400">
            {t('dashboard.realizedPnl', {
              value: formatMoneyUsd(summary.realizedPnlUsd, baseCurrency, summary.fx, language),
            })}
          </p>

          {chartPrefs.order
            .filter((kind: ChartKind) =>
              kind === 'line' ? chartPrefs.lineChart : chartPrefs.pieChart,
            )
            .map((kind: ChartKind) =>
              kind === 'line' ? (
                <ValueChart
                  key="line"
                  currency={baseCurrency}
                  fx={summary.fx}
                  language={language}
                />
              ) : (
                <AllocationChart
                  key="pie"
                  holdings={summary.holdings}
                  currency={baseCurrency}
                  fx={summary.fx}
                  language={language}
                />
              ),
            )}

          <HoldingsTable
            holdings={summary.holdings}
            currency={baseCurrency}
            fx={summary.fx}
            language={language}
          />
        </div>
      )}
    </>
  );
}
