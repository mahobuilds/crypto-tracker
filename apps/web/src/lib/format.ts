import { LANGUAGE_LOCALE } from '@crypto-tracker/shared';
import type { Currency, FxRates, Language } from '@crypto-tracker/shared';

function locale(language: Language): string {
  return LANGUAGE_LOCALE[language];
}

export function formatFiat(amount: number, currency: Currency, language: Language): string {
  return new Intl.NumberFormat(locale(language), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoneyUsd(
  amountUsd: number,
  currency: Currency,
  fx: FxRates,
  language: Language,
): string {
  return formatFiat(amountUsd * fx.rates[currency], currency, language);
}

export function formatPct(
  pct: number,
  language: Language,
  opts: { signed?: boolean } = {},
): string {
  const signed = opts.signed ?? true;
  return new Intl.NumberFormat(locale(language), {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(pct / 100);
}

export function formatQuantity(qty: number, language: Language): string {
  return new Intl.NumberFormat(locale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(qty);
}

export function formatDate(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatDateTime(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(locale(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 365 * 24 * 60 * 60 },
  { unit: 'month', seconds: 30 * 24 * 60 * 60 },
  { unit: 'week', seconds: 7 * 24 * 60 * 60 },
  { unit: 'day', seconds: 24 * 60 * 60 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
];

export function formatRelative(iso: string, language: Language): string {
  const formatter = new Intl.RelativeTimeFormat(locale(language), { numeric: 'auto' });
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const magnitude = Math.abs(diffSeconds);
  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (magnitude >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return formatter.format(diffSeconds, 'second');
}

export function pnlTone(value: number): 'positive' | 'negative' | 'neutral' {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}
