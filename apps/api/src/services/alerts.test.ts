import { describe, expect, it } from 'vitest';
import type { AlertRow } from '../db/schema';
import { buildAlertNotification, formatAlertPrice, isTriggered, rowToAlert } from './alerts';

const row: AlertRow = {
  id: 'alert-1',
  userId: 'user-1',
  coinId: 'bitcoin',
  coinSymbol: 'BTC',
  coinName: 'Bitcoin',
  targetPriceUsd: 70000,
  direction: 'above',
  enabled: true,
  triggeredAt: null,
  createdAt: '2026-09-15T10:00:00.000Z',
};

describe('isTriggered', () => {
  it('fires an "above" alert when the price is over the target', () => {
    expect(isTriggered({ direction: 'above', targetPriceUsd: 100 }, 150)).toBe(true);
  });

  it('does not fire an "above" alert when the price is under the target', () => {
    expect(isTriggered({ direction: 'above', targetPriceUsd: 100 }, 99.99)).toBe(false);
  });

  it('fires a "below" alert when the price is under the target', () => {
    expect(isTriggered({ direction: 'below', targetPriceUsd: 100 }, 50)).toBe(true);
  });

  it('does not fire a "below" alert when the price is over the target', () => {
    expect(isTriggered({ direction: 'below', targetPriceUsd: 100 }, 100.01)).toBe(false);
  });

  it('treats equality as triggered in both directions', () => {
    expect(isTriggered({ direction: 'above', targetPriceUsd: 100 }, 100)).toBe(true);
    expect(isTriggered({ direction: 'below', targetPriceUsd: 100 }, 100)).toBe(true);
  });
});

describe('rowToAlert', () => {
  it('maps every column and drops userId', () => {
    expect(rowToAlert(row)).toEqual({
      id: 'alert-1',
      coinId: 'bitcoin',
      coinSymbol: 'BTC',
      coinName: 'Bitcoin',
      targetPriceUsd: 70000,
      direction: 'above',
      enabled: true,
      triggeredAt: null,
      createdAt: '2026-09-15T10:00:00.000Z',
    });
    expect('userId' in rowToAlert(row)).toBe(false);
  });

  it('keeps a triggered timestamp and a below direction', () => {
    const alert = rowToAlert({
      ...row,
      direction: 'below',
      enabled: false,
      triggeredAt: '2026-09-15T11:00:00.000Z',
    });
    expect(alert.direction).toBe('below');
    expect(alert.enabled).toBe(false);
    expect(alert.triggeredAt).toBe('2026-09-15T11:00:00.000Z');
  });

  it('falls back to "above" for an unknown direction stored in the row', () => {
    expect(rowToAlert({ ...row, direction: 'sideways' }).direction).toBe('above');
  });
});

describe('formatAlertPrice', () => {
  it('uses up to 2 decimals for prices of at least $1', () => {
    expect(formatAlertPrice(70000)).toBe('70,000');
    expect(formatAlertPrice(1234.5678)).toBe('1,234.57');
    expect(formatAlertPrice(1)).toBe('1');
  });

  it('uses up to 6 decimals for prices below $1', () => {
    expect(formatAlertPrice(0.123456789)).toBe('0.123457');
    expect(formatAlertPrice(0.5)).toBe('0.5');
  });
});

describe('buildAlertNotification', () => {
  it('formats an "above" alert with the >= sign', () => {
    expect(buildAlertNotification(rowToAlert(row), 70123.456)).toEqual({
      title: 'BTC ≥ $70,000',
      body: 'Now $70,123.46',
      url: '/alerts',
      tag: 'alert-1',
    });
  });

  it('formats a "below" alert with the <= sign and sub-dollar precision', () => {
    const alert = rowToAlert({
      ...row,
      id: 'alert-2',
      coinSymbol: 'DOGE',
      direction: 'below',
      targetPriceUsd: 0.1,
    });
    expect(buildAlertNotification(alert, 0.0987654321)).toEqual({
      title: 'DOGE ≤ $0.1',
      body: 'Now $0.098765',
      url: '/alerts',
      tag: 'alert-2',
    });
  });
});
