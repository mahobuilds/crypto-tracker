export const CURRENCIES = ['USD', 'EUR', 'SAR', 'TRY'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const LANGUAGES = ['en', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const TRANSACTION_TYPES = ['buy', 'sell'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const ALERT_DIRECTIONS = ['above', 'below'] as const;
export type AlertDirection = (typeof ALERT_DIRECTIONS)[number];

export const CHART_KINDS = ['line', 'pie'] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  SAR: '﷼',
  TRY: '₺',
};

export const LANGUAGE_DIRECTION: Record<Language, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
};

/** BCP 47 locale used for number and date formatting per UI language. */
export const LANGUAGE_LOCALE: Record<Language, string> = {
  en: 'en-US',
  ar: 'ar-SA',
};

/** Trading fee applied to every transaction, as a fraction of quantity x price (0.1%). */
export const FEE_RATE = 0.001;

/** Fee for a trade in the transaction currency, rounded to cents. */
export function calculateFee(quantity: number, pricePerUnit: number): number {
  return Math.round(quantity * pricePerUnit * FEE_RATE * 100) / 100;
}

/** How often the client re-fetches live data, in milliseconds. */
export const PRICE_REFRESH_INTERVAL_MS = 60_000;

/** Cron expressions the Worker is triggered on (scheduled by node-cron in apps/api). */
export const CRON = {
  EVERY_MINUTE: '* * * * *',
  HOURLY: '0 * * * *',
  EVERY_6_HOURS: '0 */6 * * *',
} as const;
