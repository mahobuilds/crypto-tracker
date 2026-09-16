import { useTranslation } from 'react-i18next';
import type { Currency, Language, PriceQuote } from '@crypto-tracker/shared';
import { CloseIcon } from '@/components/icons';
import { Badge, PnlText } from '@/components/ui';
import { formatFiat, formatPct } from '@/lib/format';
import { CURRENCY_QUOTE_FIELD } from '@/features/prices/priceField';

export interface PriceRowCoin {
  id: string;
  symbol: string;
  name: string;
  thumb?: string | null;
}

export interface PriceRowProps {
  coin: PriceRowCoin;
  quote: PriceQuote | undefined;
  baseCurrency: Currency;
  language: Language;
  onRemove?: () => void;
}

function RowThumb({ coin }: { coin: PriceRowCoin }) {
  if (coin.thumb) {
    return <img src={coin.thumb} alt="" className="size-9 shrink-0 rounded-full" />;
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600 dark:bg-slate-800 dark:text-indigo-300"
    >
      {coin.symbol.charAt(0).toUpperCase()}
    </span>
  );
}

export function PriceRow({ coin, quote, baseCurrency, language, onRemove }: PriceRowProps) {
  const { t } = useTranslation();
  const price = quote ? quote[CURRENCY_QUOTE_FIELD[baseCurrency]] : null;

  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2.5">
      <RowThumb coin={coin} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold">{coin.name}</span>
        <span className="block text-sm text-slate-600 uppercase dark:text-slate-400">
          {coin.symbol}
        </span>
      </span>
      <span className="flex flex-col items-end gap-0.5">
        {price === null || price === undefined ? (
          <>
            <span className="text-base font-semibold text-slate-500 dark:text-slate-400">
              {t('prices.emDash')}
            </span>
            <Badge tone="neutral">{t('prices.noPrice')}</Badge>
          </>
        ) : (
          <>
            <span className="text-base font-semibold">
              {formatFiat(price, baseCurrency, language)}
            </span>
            <PnlText value={quote?.change24hPct ?? 0}>
              {formatPct(quote?.change24hPct ?? 0, language)}
            </PnlText>
          </>
        )}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('prices.removeFromWatchlist', { name: coin.name })}
          className="touch-target inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <CloseIcon className="size-5" />
        </button>
      ) : null}
    </li>
  );
}
