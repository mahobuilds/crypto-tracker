import { useTranslation } from 'react-i18next';
import type { Currency, Language, PriceQuote } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { Avatar, Badge, IconButton, ListRow, PnlText } from '@/components/ui';
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

export function PriceRow({ coin, quote, baseCurrency, language, onRemove }: PriceRowProps) {
  const { t } = useTranslation();
  const price = quote ? quote[CURRENCY_QUOTE_FIELD[baseCurrency]] : null;
  const priced = price !== null && price !== undefined;

  return (
    <ListRow
      leading={<Avatar label={coin.symbol} src={coin.thumb} />}
      title={coin.symbol.toUpperCase()}
      titleAside={priced ? undefined : <Badge>{t('prices.noPrice')}</Badge>}
      subtitle={coin.name}
      trailing={priced ? formatFiat(price, baseCurrency, language) : undefined}
      trailingSub={
        priced && quote ? (
          <PnlText value={quote.change24hPct} iconSize={12} className="text-[0.8125rem]">
            {formatPct(quote.change24hPct, language)}
          </PnlText>
        ) : undefined
      }
      actions={
        onRemove ? (
          <IconButton
            aria-label={t('prices.removeFromWatchlist', { name: coin.name })}
            onClick={onRemove}
          >
            <Icon.X />
          </IconButton>
        ) : undefined
      }
    />
  );
}
