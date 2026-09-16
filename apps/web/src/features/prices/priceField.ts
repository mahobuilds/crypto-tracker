import type { Currency, PriceQuote } from '@crypto-tracker/shared';

/** Maps the user's base currency to the matching field on a `PriceQuote`. */
export const CURRENCY_QUOTE_FIELD: Record<
  Currency,
  keyof Pick<PriceQuote, 'usd' | 'eur' | 'sar' | 'try'>
> = {
  USD: 'usd',
  EUR: 'eur',
  SAR: 'sar',
  TRY: 'try',
};
