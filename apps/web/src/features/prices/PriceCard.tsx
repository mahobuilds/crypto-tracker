import { useTranslation } from 'react-i18next';
import type { CoinSearchResult } from '@crypto-tracker/shared';
import { Avatar, Badge, PnlText, Skeleton } from '@/components/ui';
import { formatFiat, formatPct, formatRelative } from '@/lib/format';
import { useSettings } from '@/app/settings/SettingsProvider';
import { usePrices } from '@/hooks/usePrices';
import { CURRENCY_QUOTE_FIELD } from '@/features/prices/priceField';

export interface PriceCardProps {
  coin: CoinSearchResult;
}

/** Big price block for the coin picked in the search panel. */
export function PriceCard({ coin }: PriceCardProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { prices, updatedAt, isLoading } = usePrices([coin.id]);
  const quote = prices[coin.id];
  const language = settings.language;
  const price = quote ? quote[CURRENCY_QUOTE_FIELD[settings.baseCurrency]] : null;

  return (
    <div className="animate-rise flex items-center gap-4 rounded-[var(--r-md)] bg-surface-2 p-4">
      <Avatar label={coin.symbol} src={coin.thumb} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[1.0625rem] font-semibold">{coin.name}</p>
        <p className="text-caption text-ink-2 uppercase">{coin.symbol}</p>
        {updatedAt ? (
          <p className="text-caption mt-0.5 text-ink-3">
            {t('prices.updated', { time: formatRelative(updatedAt, language) })}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1">
        {isLoading ? (
          <>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3.5 w-14" />
          </>
        ) : price === null || price === undefined ? (
          <Badge>{t('prices.noPrice')}</Badge>
        ) : (
          <>
            <span className="tabular text-[1.375rem] leading-none font-semibold">
              {formatFiat(price, settings.baseCurrency, language)}
            </span>
            <PnlText value={quote?.change24hPct ?? 0} iconSize={14}>
              {formatPct(quote?.change24hPct ?? 0, language)}
            </PnlText>
          </>
        )}
      </div>
    </div>
  );
}
