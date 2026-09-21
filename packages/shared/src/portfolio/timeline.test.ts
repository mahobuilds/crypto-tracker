import { describe, expect, it } from 'vitest';
import { tx } from './testUtils';
import { applyChange, findTimelineViolation } from './timeline';

describe('findTimelineViolation', () => {
  it('returns null for an empty list', () => {
    expect(findTimelineViolation([])).toBeNull();
  });

  it('returns null when every sell is covered', () => {
    const txs = [
      tx({ quantity: 2 }),
      tx({ type: 'sell', quantity: 1 }),
      tx({ type: 'sell', quantity: 1 }),
    ];
    expect(findTimelineViolation(txs)).toBeNull();
  });

  it('reports the requested and available quantity of an oversell', () => {
    const buy = tx({ quantity: 2 });
    const sell = tx({ type: 'sell', quantity: 3 });
    const txs = [buy, sell];
    expect(findTimelineViolation(txs)).toEqual({
      transactionId: sell.id,
      coinId: 'bitcoin',
      occurredAt: sell.occurredAt,
      requested: 3,
      available: 2,
    });
  });

  it('reports a sell with nothing held', () => {
    const sell = tx({ type: 'sell', quantity: 1 });
    expect(findTimelineViolation([sell])?.available).toBe(0);
  });

  it('catches a sell that is only invalid because of occurredAt order', () => {
    const sell = tx({ type: 'sell', quantity: 1, occurredAt: '2024-01-01T00:00:00.000Z' });
    const buy = tx({ quantity: 1, occurredAt: '2024-02-01T00:00:00.000Z' });
    const violation = findTimelineViolation([buy, sell]);
    expect(violation?.transactionId).toBe(sell.id);
    expect(violation?.available).toBe(0);
  });

  it('returns the first violation in chronological order', () => {
    const early = tx({ type: 'sell', quantity: 1, occurredAt: '2024-01-01T00:00:00.000Z' });
    const late = tx({ type: 'sell', quantity: 1, occurredAt: '2024-03-01T00:00:00.000Z' });
    expect(findTimelineViolation([late, early])?.transactionId).toBe(early.id);
  });

  it('ignores floating point dust', () => {
    const txs = [tx({ quantity: 0.1 }), tx({ quantity: 0.2 }), tx({ type: 'sell', quantity: 0.3 })];
    expect(findTimelineViolation(txs)).toBeNull();
  });

  it('tracks wallets independently', () => {
    const sell = tx({ type: 'sell', quantity: 1, walletId: 'w2' });
    const violation = findTimelineViolation([tx({ quantity: 5, walletId: 'w1' }), sell]);
    expect(violation?.transactionId).toBe(sell.id);
    expect(violation?.available).toBe(0);
  });

  it('covers a sell with buys from the same wallet', () => {
    const txs = [
      tx({ quantity: 1, walletId: 'w1' }),
      tx({ quantity: 2, walletId: 'w2' }),
      tx({ type: 'sell', quantity: 2, walletId: 'w2' }),
    ];
    expect(findTimelineViolation(txs)).toBeNull();
  });

  it('tracks coins independently', () => {
    const sell = tx({ coinId: 'ethereum', type: 'sell', quantity: 1 });
    expect(findTimelineViolation([tx({ coinId: 'bitcoin', quantity: 5 }), sell])?.coinId).toBe(
      'ethereum',
    );
  });
});

describe('applyChange', () => {
  it('create appends without mutating', () => {
    const existing = [tx()];
    const created = tx();
    const result = applyChange(existing, { kind: 'create', transaction: created });
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(created);
    expect(existing).toHaveLength(1);
  });

  it('update replaces the transaction with the same id without mutating', () => {
    const original = tx({ id: 'x', quantity: 1 });
    const other = tx({ id: 'y' });
    const existing = [original, other];
    const updated = { ...original, quantity: 9 };
    const result = applyChange(existing, { kind: 'update', transaction: updated });
    expect(result.map((t) => t.quantity)).toEqual([9, other.quantity]);
    expect(existing[0]).toBe(original);
    expect(existing[0]?.quantity).toBe(1);
  });

  it('delete removes the transaction without mutating', () => {
    const a = tx({ id: 'a' });
    const b = tx({ id: 'b' });
    const existing = [a, b];
    const result = applyChange(existing, { kind: 'delete', id: 'a' });
    expect(result).toEqual([b]);
    expect(existing).toHaveLength(2);
  });

  it('reports deleting an old buy that invalidates a later sell', () => {
    const buy = tx({ id: 'buy', quantity: 1 });
    const sell = tx({ id: 'sell', type: 'sell', quantity: 1 });
    const existing = [buy, sell];
    expect(findTimelineViolation(existing)).toBeNull();
    const violation = findTimelineViolation(applyChange(existing, { kind: 'delete', id: 'buy' }));
    expect(violation?.transactionId).toBe('sell');
  });

  it('reports editing an old buy so it no longer covers a later sell', () => {
    const buy = tx({ id: 'buy', quantity: 2 });
    const sell = tx({ id: 'sell', type: 'sell', quantity: 2 });
    const changed = applyChange([buy, sell], {
      kind: 'update',
      transaction: { ...buy, quantity: 1 },
    });
    expect(findTimelineViolation(changed)).toMatchObject({ requested: 2, available: 1 });
  });
});
