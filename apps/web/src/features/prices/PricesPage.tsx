import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { CoinSearchResult, PortfolioSummary } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { CoinPicker } from '@/components/CoinPicker';
import {
  Button,
  EmptyState,
  ErrorMessage,
  ListGroup,
  ListLabel,
  ListRow,
  PageHeader,
  Panel,
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
  const navigate = useNavigate();
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
    if (coin) addToWatchlist(coin);
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

      <Panel
        flush
        title={t('prices.yourCoins')}
        className="animate-rise"
        style={{ '--i': 1 } as React.CSSProperties}
      >
        {portfolio.isPending ? (
          <ListRow.Skeleton rows={3} />
        ) : portfolio.isError ? (
          <div className="p-5 pt-0">
            <ErrorMessage
              message={t('prices.loadError')}
              onRetry={() => void portfolio.refetch()}
            />
          </div>
        ) : holdings.length === 0 ? (
          <EmptyState
            icon={<Icon.Coins />}
            title={t('prices.noHoldingsTitle')}
            description={t('prices.noHoldingsDescription')}
            action={
              <Button onClick={() => void navigate('/transactions')}>
                {t('prices.goToTransactions')}
              </Button>
            }
          />
        ) : (
          <ListGroup className="pb-2">
            {holdings.map((holding) => (
              <PriceRow
                key={holding.coinId}
                coin={{ id: holding.coinId, symbol: holding.coinSymbol, name: holding.coinName }}
                quote={ownedPrices.prices[holding.coinId]}
                baseCurrency={settings.baseCurrency}
                language={settings.language}
              />
            ))}
          </ListGroup>
        )}
      </Panel>

      <Panel
        title={t('prices.searchAnyCoin')}
        className="animate-rise"
        style={{ '--i': 2 } as React.CSSProperties}
      >
        <div className="flex flex-col gap-4">
          <CoinPicker
            value={selectedCoin}
            onChange={handleCoinSelected}
            label={t('prices.searchLabel')}
          />
          {selectedCoin ? <PriceCard coin={selectedCoin} /> : null}
        </div>
      </Panel>

      {watchlist.length > 0 ? (
        <Panel flush className="animate-rise" style={{ '--i': 3 } as React.CSSProperties}>
          <ListGroup className="pb-2">
            <ListLabel className="border-0 pt-5">{t('prices.watchlist')}</ListLabel>
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
          </ListGroup>
        </Panel>
      ) : null}
    </>
  );
}
