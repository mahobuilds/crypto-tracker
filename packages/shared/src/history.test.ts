import { describe, expect, it } from 'vitest';
import { historyRangeSchema, rangeToSince } from './history';

const now = new Date('2024-06-15T12:00:00.000Z');

describe('historyRangeSchema', () => {
  it('accepts every supported range', () => {
    for (const range of ['24h', '7d', '30d', '90d', '1y', 'all']) {
      expect(historyRangeSchema.safeParse(range).success).toBe(true);
    }
  });

  it('rejects unknown ranges', () => {
    expect(historyRangeSchema.safeParse('2d').success).toBe(false);
    expect(historyRangeSchema.safeParse('').success).toBe(false);
    expect(historyRangeSchema.safeParse(7).success).toBe(false);
  });
});

describe('rangeToSince', () => {
  it('returns null for all', () => {
    expect(rangeToSince('all', now)).toBeNull();
  });

  it('subtracts the window from now', () => {
    expect(rangeToSince('24h', now)?.toISOString()).toBe('2024-06-14T12:00:00.000Z');
    expect(rangeToSince('7d', now)?.toISOString()).toBe('2024-06-08T12:00:00.000Z');
    expect(rangeToSince('30d', now)?.toISOString()).toBe('2024-05-16T12:00:00.000Z');
    expect(rangeToSince('90d', now)?.toISOString()).toBe('2024-03-17T12:00:00.000Z');
    expect(rangeToSince('1y', now)?.toISOString()).toBe('2023-06-16T12:00:00.000Z');
  });

  it('does not mutate now', () => {
    const copy = new Date(now.getTime());
    rangeToSince('7d', copy);
    expect(copy.getTime()).toBe(now.getTime());
  });
});
