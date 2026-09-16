import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { CoinSearchResult, PortfolioSummary } from '@crypto-tracker/shared';
import { ChartIcon } from '@/components/icons';
import { CoinPicker } from '@/components/CoinPicker';
import {
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import { useSettings } from '@/app/settings/SettingsProvider';
import { usePrices } from '@/hooks/usePrices';
import { PriceCard } from '@/features/prices/PriceCard';
import { PriceRow } from '@/features/prices/PriceRow';
import { useWatchlist } from '@/features/prices/useWatchlist';

function fetchPortfolio(): Promise<PortfolioSummary> {
  return apiFetch<PortfolioSummary>('/api/portfolio');
}

export function PricesPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [selectedCoin, setSelectedCoin] = useState<CoinSearchResult | null>(null);
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const portfolio = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    staleTime: 30_000,
  });

  const holdings = portfolio.data?.holdings ?? [];
  const ownedCoinIds = useMemo(() => holdings.map((holding) => holding.coinId), [holdings]);
  const ownedPrices = usePrices(ownedCoinIds);

  const watchlistCoinIds = useMemo(() => watchlist.map((coin) => coin.id), [watchlist]);
  const watchlistPrices = usePrices(watchlistCoinIds);

  function handleCoinSelected(coin: CoinSearchResult | null) {
    setSelectedCoin(coin);
    if (coin) {
      addToWatchlist(coin);
    }
  }

  return (
    <>
      <PageHeader
        title={t('prices.title')}
        subtitle={
          ownedPrices.updatedAt
            ? t('prices.updated', {
                time: formatRelative(ownedPrices.updatedAt, settings.language),
              })
            : undefined
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('prices.yourCoins')}</CardTitle>
        </CardHeader>

        {portfolio.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : portfolio.isError ? (
          <ErrorMessage message={t('prices.loadError')} onRetry={() => void portfolio.refetch()} />
        ) : holdings.length === 0 ? (
          <EmptyState
            icon={<ChartIcon className="size-7" />}
            title={t('prices.noHoldingsTitle')}
            description={t('prices.noHoldingsDescription')}
            action={
              <Link
                to="/transactions"
                className="touch-target inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-indigo-700"
              >
                {t('prices.goToTransactions')}
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {holdings.map((holding) => (
              <PriceRow
                key={holding.coinId}
                coin={{ id: holding.coinId, symbol: holding.coinSymbol, name: holding.coinName }}
                quote={ownedPrices.prices[holding.coinId]}
                baseCurrency={settings.baseCurrency}
                language={settings.language}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('prices.searchAnyCoin')}</CardTitle>
        </CardHeader>

        <div className="flex flex-col gap-4">
          <CoinPicker
            value={selectedCoin}
            onChange={handleCoinSelected}
            label={t('prices.searchLabel')}
          />

          {selectedCoin ? <PriceCard coin={selectedCoin} /> : null}

          {watchlist.length > 0 ? (
            <div>
              <h3 className="mb-2 text-base font-semibold text-slate-700 dark:text-slate-300">
                {t('prices.watchlist')}
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {watchlist.map((coin) => (
                  <PriceRow
                    key={coin.id}
                    coin={coin}
                    quote={watchlistPrices.prices[coin.id]}
                    baseCurrency={settings.baseCurrency}
                    language={settings.language}
                    onRemove={() => removeFromWatchlist(coin.id)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>
    </>
  );
}
