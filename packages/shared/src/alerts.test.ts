import { describe, expect, it } from 'vitest';
import { alertInputSchema } from './alerts';
import type { AlertInput } from './types';

const valid = {
  coinId: 'ethereum',
  coinSymbol: 'eth',
  coinName: 'Ethereum',
  targetPriceUsd: 4000,
  direction: 'above',
  enabled: false,
};

function failingPaths(input: unknown): string[] {
  const result = alertInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

describe('alertInputSchema', () => {
  it('accepts a valid body and upper-cases the symbol', () => {
    const result = alertInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      const data: AlertInput = result.data;
      expect(data).toEqual({ ...valid, coinSymbol: 'ETH' });
    }
  });

  it('defaults enabled to true', () => {
    const { enabled: _enabled, ...rest } = valid;
    expect(alertInputSchema.parse(rest).enabled).toBe(true);
  });

  it('rejects a non-positive or non-finite target price', () => {
    expect(failingPaths({ ...valid, targetPriceUsd: 0 })).toEqual(['targetPriceUsd']);
    expect(failingPaths({ ...valid, targetPriceUsd: -5 })).toEqual(['targetPriceUsd']);
    expect(failingPaths({ ...valid, targetPriceUsd: Number.NaN })).toEqual(['targetPriceUsd']);
  });

  it('rejects an unknown direction', () => {
    expect(failingPaths({ ...valid, direction: 'sideways' })).toEqual(['direction']);
  });

  it('rejects empty coin fields', () => {
    expect(failingPaths({ ...valid, coinId: ' ' })).toEqual(['coinId']);
    expect(failingPaths({ ...valid, coinName: '' })).toEqual(['coinName']);
  });

  it('rejects a non-boolean enabled', () => {
    expect(failingPaths({ ...valid, enabled: 'true' })).toEqual(['enabled']);
  });
});
