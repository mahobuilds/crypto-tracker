import { describe, expect, it } from 'vitest';
import { sortWallets, walletInputSchema, walletNameKey } from './wallets';

const solo = { name: 'Binance' };

function walletFailingPaths(input: unknown): string[] {
  const result = walletInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

describe('walletInputSchema', () => {
  it('trims the name', () => {
    expect(walletInputSchema.parse({ name: '  Binance  ' })).toEqual({
      name: 'Binance',
      scope: 'personal',
      participants: [],
    });
  });

  it('defaults scope to personal (solo) with no participants', () => {
    const result = walletInputSchema.parse(solo);
    expect(result.scope).toBe('personal');
    expect(result.participants).toEqual([]);
  });

  it('rejects participants on a solo wallet', () => {
    expect(
      walletFailingPaths({
        ...solo,
        scope: 'personal',
        participants: [{ name: 'Ali', sharePct: 50 }],
      }),
    ).toEqual(['participants']);
  });

  it('accepts a group wallet whose shares add up to 100 with one owner', () => {
    const group = {
      ...solo,
      scope: 'group',
      participants: [
        { name: 'Me', sharePct: 60, isMe: true },
        { name: 'Omar', sharePct: 40 },
      ],
    };
    expect(walletFailingPaths(group)).toEqual([]);
    expect(walletInputSchema.parse(group).participants).toEqual([
      { name: 'Me', sharePct: 60, isMe: true },
      { name: 'Omar', sharePct: 40, isMe: false },
    ]);
  });

  it('rejects group shares that sum below or above 100', () => {
    const below = {
      ...solo,
      scope: 'group',
      participants: [{ name: 'Me', sharePct: 70, isMe: true }],
    };
    const above = {
      ...solo,
      scope: 'group',
      participants: [
        { name: 'Me', sharePct: 70, isMe: true },
        { name: 'Omar', sharePct: 40 },
      ],
    };
    expect(walletFailingPaths(below)).toEqual(['participants']);
    expect(walletFailingPaths(above)).toEqual(['participants']);
    expect(walletFailingPaths({ ...solo, scope: 'group', participants: [] })).toEqual([
      'participants',
      'participants',
    ]);
  });

  it('requires exactly one participant marked as the owner', () => {
    const none = {
      ...solo,
      scope: 'group',
      participants: [
        { name: 'Ali', sharePct: 60 },
        { name: 'Omar', sharePct: 40 },
      ],
    };
    const two = {
      ...solo,
      scope: 'group',
      participants: [
        { name: 'Me', sharePct: 60, isMe: true },
        { name: 'Me again', sharePct: 40, isMe: true },
      ],
    };
    expect(walletFailingPaths(none)).toEqual(['participants']);
    expect(walletFailingPaths(two)).toEqual(['participants']);
  });

  it('rejects a share outside 1-99, a fractional share, or a blank name', () => {
    const withFirst = (participant: unknown) => ({
      ...solo,
      scope: 'group',
      participants: [participant, { name: 'Omar', sharePct: 1, isMe: true }],
    });
    expect(walletFailingPaths(withFirst({ name: 'Ali', sharePct: 0 }))).toContain(
      'participants.0.sharePct',
    );
    expect(walletFailingPaths(withFirst({ name: 'Ali', sharePct: 100 }))).toContain(
      'participants.0.sharePct',
    );
    expect(walletFailingPaths(withFirst({ name: 'Ali', sharePct: 49.5 }))).toContain(
      'participants.0.sharePct',
    );
    expect(walletFailingPaths(withFirst({ name: '   ', sharePct: 99 }))).toContain(
      'participants.0.name',
    );
  });

  it('rejects an empty name', () => {
    expect(walletInputSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects a name over the maximum length', () => {
    expect(walletInputSchema.safeParse({ name: 'x'.repeat(41) }).success).toBe(false);
  });
});

describe('walletNameKey', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(walletNameKey(' Ledger ')).toBe(walletNameKey('ledger'));
  });
});

describe('sortWallets', () => {
  it('orders by creation time then name', () => {
    const wallets = [
      { name: 'B', createdAt: '2024-02-01T00:00:00.000Z' },
      { name: 'A', createdAt: '2024-02-01T00:00:00.000Z' },
      { name: 'Main', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    expect(sortWallets(wallets).map((w) => w.name)).toEqual(['Main', 'A', 'B']);
  });
});
