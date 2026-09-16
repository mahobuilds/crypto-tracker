import type { Currency } from '../constants';
import type { FxRates } from '../types';

function rateFor(currency: Currency, fx: FxRates): number {
  if (currency === 'USD') return 1;
  const rate: number | undefined = fx.rates[currency];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Missing or invalid FX rate for ${currency}`);
  }
  return rate;
}

/** Converts a USD amount into `currency` using `fx.rates` (units per 1 USD). */
export function convertFromUsd(amountUsd: number, currency: Currency, fx: FxRates): number {
  return amountUsd * rateFor(currency, fx);
}

/** Converts an amount in `currency` into USD using `fx.rates` (units per 1 USD). */
export function convertToUsd(amount: number, currency: Currency, fx: FxRates): number {
  return amount / rateFor(currency, fx);
}
