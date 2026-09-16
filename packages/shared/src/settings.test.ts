import { describe, expect, it } from 'vitest';
import { chartPrefsSchema, settingsSchema, settingsUpdateSchema } from './settings';
import { DEFAULT_SETTINGS, type Settings } from './types';

function failingPaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.success ? [] : (result.error?.issues.map((i) => i.path.join('.')) ?? []);
}

describe('settingsSchema', () => {
  it('accepts the default settings', () => {
    const result = settingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(result.success).toBe(true);
    if (result.success) {
      const parsed: Settings = result.data satisfies Settings;
      expect(parsed).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('rejects an unknown language', () => {
    const result = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, language: 'fr' });
    expect(result.success).toBe(false);
    expect(failingPaths(result)).toEqual(['language']);
  });

  it('rejects an unknown currency and theme', () => {
    const result = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      baseCurrency: 'GBP',
      theme: 'blue',
    });
    expect(failingPaths(result).sort()).toEqual(['baseCurrency', 'theme']);
  });

  it('rejects a missing field', () => {
    const { largeText: _largeText, ...rest } = DEFAULT_SETTINGS;
    expect(failingPaths(settingsSchema.safeParse(rest))).toEqual(['largeText']);
  });

  it('rejects an unknown chart kind in the order', () => {
    const result = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      chartPrefs: { lineChart: true, pieChart: false, order: ['line', 'bar'] },
    });
    expect(failingPaths(result)).toEqual(['chartPrefs.order.1']);
  });
});

describe('chartPrefsSchema', () => {
  it('accepts an empty order', () => {
    expect(
      chartPrefsSchema.safeParse({ lineChart: false, pieChart: false, order: [] }).success,
    ).toBe(true);
  });

  it('rejects non-boolean flags', () => {
    const result = chartPrefsSchema.safeParse({ lineChart: 'yes', pieChart: true, order: [] });
    expect(failingPaths(result)).toEqual(['lineChart']);
  });
});

describe('settingsUpdateSchema', () => {
  it('accepts a partial update', () => {
    const result = settingsUpdateSchema.safeParse({ theme: 'dark' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ theme: 'dark' });
  });

  it('accepts an empty object', () => {
    expect(settingsUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('still validates the fields that are present', () => {
    expect(failingPaths(settingsUpdateSchema.safeParse({ largeText: 1 }))).toEqual(['largeText']);
  });
});
