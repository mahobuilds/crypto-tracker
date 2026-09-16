import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '@crypto-tracker/shared';
import { mergeSettings } from './settings';

describe('mergeSettings', () => {
  it('overrides provided fields', () => {
    const result = mergeSettings(DEFAULT_SETTINGS, { theme: 'dark', largeText: true });
    expect(result.theme).toBe('dark');
    expect(result.largeText).toBe(true);
  });

  it('preserves untouched fields', () => {
    const current: Settings = { ...DEFAULT_SETTINGS, baseCurrency: 'EUR', alertsEnabled: true };
    const result = mergeSettings(current, { theme: 'dark' });
    expect(result.baseCurrency).toBe('EUR');
    expect(result.alertsEnabled).toBe(true);
    expect(result.language).toBe(DEFAULT_SETTINGS.language);
  });

  it('replaces chartPrefs whole rather than merging its fields', () => {
    const current: Settings = {
      ...DEFAULT_SETTINGS,
      chartPrefs: { lineChart: true, pieChart: true, order: ['line', 'pie'] },
    };
    const result = mergeSettings(current, {
      chartPrefs: { lineChart: false, pieChart: false, order: ['pie'] },
    });
    expect(result.chartPrefs).toEqual({ lineChart: false, pieChart: false, order: ['pie'] });
  });

  it('returns an equal object for an empty patch', () => {
    const result = mergeSettings(DEFAULT_SETTINGS, {});
    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});
