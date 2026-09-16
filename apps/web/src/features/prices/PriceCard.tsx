import { useTranslation } from 'react-i18next';
import type { CoinSearchResult } from '@crypto-tracker/shared';
import { CoinIcon } from '@/components/icons';
import { Badge, Card, PnlText, Spinner } from '@/components/ui';
import { formatFiat, formatPct, formatRelative } from '@/lib/format';
import { useSettings } from '@/app/settings/SettingsProvider';
import { usePrices } from '@/hooks/usePrices';
import { CURRENCY_QUOTE_FIELD } from '@/features/prices/priceField';

export interface PriceCardProps {
  coin: CoinSearchResult;
}

export function PriceCard({ coin }: PriceCardProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { prices, updatedAt, isLoading } = usePrices([coin.id]);
  const quote = prices[coin.id];
  const language = settings.language;
  const price = quote ? quote[CURRENCY_QUOTE_FIELD[settings.baseCurrency]] : null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {coin.thumb ? (
          <img src={coin.thumb} alt="" className="size-12 shrink-0 rounded-full" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-300">
            <CoinIcon className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{coin.name}</p>
          <p className="text-sm text-slate-600 uppercase dark:text-slate-400">{coin.symbol}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Spinner size="md" />
        </div>
      ) : price === null || price === undefined ? (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-slate-500 dark:text-slate-400">
            {t('prices.emDash')}
          </span>
          <Badge tone="neutral">{t('prices.noPrice')}</Badge>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-bold">
            {formatFiat(price, settings.baseCurrency, language)}
          </span>
          <PnlText value={quote?.change24hPct ?? 0} className="text-lg">
            {formatPct(quote?.change24hPct ?? 0, language)}
          </PnlText>
        </div>
      )}

      {updatedAt ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('prices.updated', { time: formatRelative(updatedAt, language) })}
        </p>
      ) : null}
    </Card>
  );
}
