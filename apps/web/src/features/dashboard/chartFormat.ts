import { LANGUAGE_LOCALE } from '@crypto-tracker/shared';
import type { Currency, FxRates, Language } from '@crypto-tracker/shared';

/** Compact currency formatting for chart axes, e.g. "$12.3K". */
export function formatMoneyCompact(
  amountUsd: number,
  currency: Currency,
  fx: FxRates,
  language: Language,
): string {
  return new Intl.NumberFormat(LANGUAGE_LOCALE[language], {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amountUsd * fx.rates[currency]);
}
