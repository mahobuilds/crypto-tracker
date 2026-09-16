import { describe, expect, it } from 'vitest';
import {
  ALERT_DIRECTIONS,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  LANGUAGES,
  LANGUAGE_DIRECTION,
  THEMES,
  TRANSACTION_TYPES,
} from './constants';

describe('constants', () => {
  it('lists the supported currencies', () => {
    expect(CURRENCIES).toEqual(['USD', 'EUR', 'SAR', 'TRY']);
  });

  it('has a symbol for every currency', () => {
    for (const currency of CURRENCIES) {
      expect(CURRENCY_SYMBOLS[currency]).toBeTruthy();
    }
  });

  it('lists languages, themes, transaction types and alert directions', () => {
    expect(LANGUAGES).toEqual(['en', 'ar']);
    expect(THEMES).toEqual(['light', 'dark', 'system']);
    expect(TRANSACTION_TYPES).toEqual(['buy', 'sell']);
    expect(ALERT_DIRECTIONS).toEqual(['above', 'below']);
  });

  it('renders Arabic right-to-left', () => {
    expect(LANGUAGE_DIRECTION.ar).toBe('rtl');
    expect(LANGUAGE_DIRECTION.en).toBe('ltr');
  });
});
