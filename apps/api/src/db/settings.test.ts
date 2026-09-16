import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@crypto-tracker/shared';
import type { SettingsRow } from './schema';
import { rowToSettings } from './settings';

function makeRow(overrides: Partial<SettingsRow> = {}): SettingsRow {
  return {
    userId: 'user-1',
    language: 'ar',
    baseCurrency: 'EUR',
    largeText: true,
    theme: 'dark',
    alertsEnabled: true,
    chartPrefs: JSON.stringify({ lineChart: false, pieChart: true, order: ['pie', 'line'] }),
    updatedAt: '2026-09-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('rowToSettings', () => {
  it('maps a valid row, parsing chartPrefs JSON', () => {
    expect(rowToSettings(makeRow())).toEqual({
      language: 'ar',
      baseCurrency: 'EUR',
      largeText: true,
      theme: 'dark',
      alertsEnabled: true,
      chartPrefs: { lineChart: false, pieChart: true, order: ['pie', 'line'] },
    });
  });

  it('falls back to default chartPrefs when the JSON is corrupt', () => {
    const result = rowToSettings(makeRow({ chartPrefs: '{not json' }));
    expect(result.chartPrefs).toEqual(DEFAULT_SETTINGS.chartPrefs);
    expect(result.language).toBe('ar');
  });

  it('falls back to default chartPrefs when the JSON has the wrong shape', () => {
    expect(rowToSettings(makeRow({ chartPrefs: '"string"' })).chartPrefs).toEqual(
      DEFAULT_SETTINGS.chartPrefs,
    );
    expect(rowToSettings(makeRow({ chartPrefs: '[]' })).chartPrefs).toEqual(
      DEFAULT_SETTINGS.chartPrefs,
    );
    expect(
      rowToSettings(makeRow({ chartPrefs: JSON.stringify({ lineChart: true }) })).chartPrefs,
    ).toEqual(DEFAULT_SETTINGS.chartPrefs);
    expect(
      rowToSettings(
        makeRow({
          chartPrefs: JSON.stringify({ lineChart: true, pieChart: true, order: ['bar'] }),
        }),
      ).chartPrefs,
    ).toEqual(DEFAULT_SETTINGS.chartPrefs);
  });

  it('falls back to defaults for invalid enum values', () => {
    const result = rowToSettings(makeRow({ language: 'fr', baseCurrency: 'GBP', theme: 'sepia' }));
    expect(result.language).toBe(DEFAULT_SETTINGS.language);
    expect(result.baseCurrency).toBe(DEFAULT_SETTINGS.baseCurrency);
    expect(result.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(result.largeText).toBe(true);
    expect(result.alertsEnabled).toBe(true);
  });
});
